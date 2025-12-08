import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';
import { conversationTestService } from '../services/conversationTestService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// In-memory storage for demo
const testCases = new Map<string, any>();

// Create single test case with conversation turns
router.post('/', async (req, res) => {
    try {
        const { displayName, tags, notes, testConfig, conversationTurns, agentId } = req.body;

        const testCase = {
            id: uuidv4(),
            displayName,
            tags,
            notes,
            testConfig,
            conversationTurns,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

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
                testCase.dialogflowName = dfTestCase.name;
            } catch (error: any) {
                console.warn('Could not create in Dialogflow:', error.message);
                // Continue with local storage
            }
        }

        testCases.set(testCase.id, testCase);
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
        const createdTestCases: any[] = [];
        const errors: any[] = [];

        for (const tc of testCasesData) {
            const testCase = {
                id: uuidv4(),
                ...tc,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            // Create in Dialogflow if agentId provided
            if (agentId) {
                try {
                    const dfTestCase = await conversationTestService.createTestCase(agentId, tc);
                    testCase.dialogflowName = dfTestCase.name;
                } catch (error: any) {
                    errors.push({
                        testName: tc.displayName,
                        error: error.message,
                    });
                }
            }

            testCases.set(testCase.id, testCase);
            createdTestCases.push(testCase);
            created++;
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
        const syncedCases: any[] = [];
        for (const dfCase of dfTestCases) {
            const testCase = {
                id: uuidv4(),
                dialogflowName: dfCase.name,
                displayName: dfCase.displayName,
                tags: dfCase.tags,
                notes: dfCase.notes,
                testConfig: dfCase.testConfig,
                conversationTurns: dfCase.testCaseConversationTurns,
                lastResult: dfCase.lastTestResult?.testResult,
                createdAt: dfCase.creationTime || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            testCases.set(testCase.id, testCase);
            syncedCases.push(testCase);
        }

        res.json({
            success: true,
            data: { synced: syncedCases.length, testCases: syncedCases },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// List test cases
router.get('/', (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const items = Array.from(testCases.values());

    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    res.json({
        success: true,
        data: {
            items: paginatedItems,
            total: items.length,
            page,
            pageSize,
            totalPages: Math.ceil(items.length / pageSize),
        },
    });
});

// Get single test case
router.get('/:id', (req, res) => {
    const testCase = testCases.get(req.params.id);
    if (!testCase) {
        return res.status(404).json({ success: false, error: 'Test case not found' });
    }
    res.json({ success: true, data: testCase });
});

// Update test case
router.put('/:id', (req, res) => {
    const testCase = testCases.get(req.params.id);
    if (!testCase) {
        return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    const updated = {
        ...testCase,
        ...req.body,
        updatedAt: new Date().toISOString(),
    };
    testCases.set(req.params.id, updated);
    res.json({ success: true, data: updated });
});

// Delete test case
router.delete('/:id', async (req, res) => {
    const testCase = testCases.get(req.params.id);
    if (!testCase) {
        return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    testCases.delete(req.params.id);
    res.json({ success: true });
});

// Bulk delete
router.post('/bulk-delete', (req, res) => {
    const { ids } = req.body;
    let deleted = 0;
    ids.forEach((id: string) => {
        if (testCases.delete(id)) deleted++;
    });
    res.json({ success: true, data: { deleted } });
});

export default router;
