import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';
import { conversationTestService } from '../services/conversationTestService.js';
import { db } from '../database.js';
import { validateRequest, testCaseSchema, bulkTestCasesSchema, bulkDeleteSchema } from '../utils/validation.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Test Case interface for type safety
interface TestCase {
    id: string;
    displayName: string;
    tags?: string[];
    notes?: string;
    testConfig?: any;
    conversationTurns?: any[];
    dialogflowName?: string;
    agentId?: string;
    createdAt: string;
    updatedAt: string;
}

// Prepared statements for better performance
const getAllTestCases = db.prepare('SELECT * FROM test_cases ORDER BY created_at DESC LIMIT ? OFFSET ?');
const countTestCases = db.prepare('SELECT COUNT(*) as count FROM test_cases');
const getTestCaseById = db.prepare('SELECT * FROM test_cases WHERE id = ?');
const insertTestCase = db.prepare(`
    INSERT INTO test_cases (id, display_name, tags, notes, test_config, conversation_turns_json, dialogflow_name, agent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateTestCaseById = db.prepare(`
    UPDATE test_cases SET display_name = ?, tags = ?, notes = ?, test_config = ?, conversation_turns_json = ?, updated_at = ?
    WHERE id = ?
`);
const deleteTestCaseById = db.prepare('DELETE FROM test_cases WHERE id = ?');

// Helper to map DB row to API response format
function mapTestCaseRow(row: any): TestCase {
    return {
        id: row.id,
        displayName: row.display_name,
        tags: row.tags ? JSON.parse(row.tags) : [],
        notes: row.notes,
        testConfig: row.test_config ? JSON.parse(row.test_config) : null,
        conversationTurns: row.conversation_turns_json ? JSON.parse(row.conversation_turns_json) : [],
        dialogflowName: row.dialogflow_name,
        agentId: row.agent_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Create single test case with conversation turns
router.post('/', async (req, res) => {
    try {
        const { displayName, tags, notes, testConfig, conversationTurns, agentId } = req.body;

        const id = uuidv4();
        const createdAt = new Date().toISOString();
        let dialogflowName: string | null = null;

        // If agentId provided, create in Dialogflow
        if (agentId) {
            try {
                const dfTestCase = await conversationTestService.createTestCase(agentId, {
                    displayName,
                    tags,
                    notes,
                    testConfig,
                    testCaseConversationTurns: conversationTurns,
                });
                dialogflowName = dfTestCase.name;
            } catch (error: any) {
                console.warn('Could not create in Dialogflow:', error.message);
            }
        }

        // Insert into database
        insertTestCase.run(
            id,
            displayName,
            tags ? JSON.stringify(tags) : null,
            notes || null,
            testConfig ? JSON.stringify(testConfig) : null,
            conversationTurns ? JSON.stringify(conversationTurns) : null,
            dialogflowName,
            agentId || null,
            createdAt,
            createdAt
        );

        const testCase: TestCase = {
            id,
            displayName,
            tags,
            notes,
            testConfig,
            conversationTurns,
            dialogflowName: dialogflowName || undefined,
            agentId,
            createdAt,
            updatedAt: createdAt,
        };

        res.json({ success: true, data: testCase });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload CSV file with conversation tests
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        });

        // Parse CSV to test cases using the service
        const testCasesData = conversationTestService.parseCSVToTestCases(records);

        // Convert to conversations format for preview
        const conversations = testCasesData.map((tc) => ({
            conversationId: uuidv4(),
            displayName: tc.displayName,
            turns: tc.testCaseConversationTurns,
            tags: tc.tags,
            testConfig: tc.testConfig,
        }));

        res.json({
            success: true,
            data: {
                conversations,
                testCases: testCasesData,
                totalTestCases: testCasesData.length,
                totalTurns: testCasesData.reduce((sum, tc) => sum + tc.testCaseConversationTurns.length, 0),
            },
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: `Failed to parse CSV: ${error.message}`,
        });
    }
});

// Create bulk test cases from parsed conversations
router.post('/bulk', async (req, res) => {
    try {
        const { testCases: testCasesData, agentId } = req.body;
        let created = 0;
        const createdTestCases: TestCase[] = [];
        const errors: any[] = [];

        const insertMany = db.transaction((cases: any[]) => {
            for (const tc of cases) {
                const id = uuidv4();
                const createdAt = new Date().toISOString();
                let dialogflowName: string | null = null;

                insertTestCase.run(
                    id,
                    tc.displayName,
                    tc.tags ? JSON.stringify(tc.tags) : null,
                    tc.notes || null,
                    tc.testConfig ? JSON.stringify(tc.testConfig) : null,
                    tc.testCaseConversationTurns ? JSON.stringify(tc.testCaseConversationTurns) : null,
                    dialogflowName,
                    agentId || null,
                    createdAt,
                    createdAt
                );

                createdTestCases.push({
                    id,
                    displayName: tc.displayName,
                    tags: tc.tags,
                    notes: tc.notes,
                    testConfig: tc.testConfig,
                    conversationTurns: tc.testCaseConversationTurns,
                    agentId,
                    createdAt,
                    updatedAt: createdAt,
                });
                created++;
            }
        });

        insertMany(testCasesData);

        // Try to create in Dialogflow (async, after DB insert)
        if (agentId) {
            for (let i = 0; i < testCasesData.length; i++) {
                try {
                    const dfTestCase = await conversationTestService.createTestCase(agentId, testCasesData[i]);
                    createdTestCases[i].dialogflowName = dfTestCase.name;
                } catch (error: any) {
                    errors.push({
                        testName: testCasesData[i].displayName,
                        error: error.message,
                    });
                }
            }
        }

        res.json({
            success: true,
            data: { created, testCases: createdTestCases, errors },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sync test cases from Dialogflow
router.get('/sync/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const dfTestCases = await conversationTestService.listTestCases(agentId);

        // Store locally
        const syncedCases: TestCase[] = [];
        const insertSync = db.transaction((cases: any[]) => {
            for (const dfCase of cases) {
                const id = uuidv4();
                const createdAt = dfCase.creationTime || new Date().toISOString();
                const updatedAt = new Date().toISOString();

                insertTestCase.run(
                    id,
                    dfCase.displayName,
                    dfCase.tags ? JSON.stringify(dfCase.tags) : null,
                    dfCase.notes || null,
                    dfCase.testConfig ? JSON.stringify(dfCase.testConfig) : null,
                    dfCase.testCaseConversationTurns ? JSON.stringify(dfCase.testCaseConversationTurns) : null,
                    dfCase.name,
                    agentId,
                    createdAt,
                    updatedAt
                );

                syncedCases.push({
                    id,
                    dialogflowName: dfCase.name,
                    displayName: dfCase.displayName,
                    tags: dfCase.tags,
                    notes: dfCase.notes,
                    testConfig: dfCase.testConfig,
                    conversationTurns: dfCase.testCaseConversationTurns,
                    agentId,
                    createdAt,
                    updatedAt,
                });
            }
        });

        insertSync(dfTestCases);

        res.json({
            success: true,
            data: { synced: syncedCases.length, testCases: syncedCases },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// List test cases with pagination
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const offset = (page - 1) * pageSize;

        const rows = getAllTestCases.all(pageSize, offset);
        const totalResult = countTestCases.get() as { count: number };
        const total = totalResult.count;

        const items = rows.map(mapTestCaseRow);

        res.json({
            success: true,
            data: {
                items,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single test case
router.get('/:id', (req, res) => {
    try {
        const row = getTestCaseById.get(req.params.id);
        if (!row) {
            return res.status(404).json({ success: false, error: 'Test case not found' });
        }
        res.json({ success: true, data: mapTestCaseRow(row) });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update test case
router.put('/:id', (req, res) => {
    try {
        const row = getTestCaseById.get(req.params.id);
        if (!row) {
            return res.status(404).json({ success: false, error: 'Test case not found' });
        }

        const existing = mapTestCaseRow(row);
        const updated = {
            ...existing,
            ...req.body,
            updatedAt: new Date().toISOString(),
        };

        updateTestCaseById.run(
            updated.displayName,
            updated.tags ? JSON.stringify(updated.tags) : null,
            updated.notes || null,
            updated.testConfig ? JSON.stringify(updated.testConfig) : null,
            updated.conversationTurns ? JSON.stringify(updated.conversationTurns) : null,
            updated.updatedAt,
            req.params.id
        );

        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete test case
router.delete('/:id', (req, res) => {
    try {
        const result = deleteTestCaseById.run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Test case not found' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk delete
router.post('/bulk-delete', (req, res) => {
    try {
        const { ids } = req.body;
        let deleted = 0;

        const deleteMany = db.transaction((idsToDelete: string[]) => {
            for (const id of idsToDelete) {
                const result = deleteTestCaseById.run(id);
                if (result.changes > 0) deleted++;
            }
        });

        deleteMany(ids);
        res.json({ success: true, data: { deleted } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
