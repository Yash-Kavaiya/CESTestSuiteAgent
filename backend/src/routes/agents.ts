import { Router } from 'express';
import { db } from '../database.js';
import { validateRequest, createAgentSchema } from '../utils/validation.js';

const router = Router();

// Agent interface for type safety
interface Agent {
    id: string;
    displayName: string;
    projectId: string;
    location: string;
    defaultLanguageCode: string;
    createdAt: string;
}

// Prepared statements for better performance
const getAllAgents = db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
const getAgentById = db.prepare('SELECT * FROM agents WHERE id = ?');
const insertAgent = db.prepare(`
    INSERT INTO agents (id, project_id, location, display_name, default_language_code, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);
const deleteAgentById = db.prepare('DELETE FROM agents WHERE id = ?');

// Helper to map DB row to API response format
function mapAgentRow(row: any): Agent {
    return {
        id: row.id,
        displayName: row.display_name,
        projectId: row.project_id,
        location: row.location,
        defaultLanguageCode: row.default_language_code,
        createdAt: row.created_at,
    };
}

// List all agents
router.get('/', (req, res) => {
    try {
        const rows = getAllAgents.all();
        const agents = rows.map(mapAgentRow);
        res.json({ success: true, data: agents });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get agent details
router.get('/:id', (req, res) => {
    try {
        const row = getAgentById.get(req.params.id);
        if (!row) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }
        res.json({ success: true, data: mapAgentRow(row) });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add agent configuration - with Zod validation
router.post('/', validateRequest(createAgentSchema), (req, res) => {
    try {
        const { projectId, location, agentId, displayName } = req.body;

        const createdAt = new Date().toISOString();
        const locationValue = location || 'us-central1';

        insertAgent.run(agentId, projectId, locationValue, displayName, 'en', createdAt);

        const agent: Agent = {
            id: agentId,
            displayName,
            projectId,
            location: locationValue,
            defaultLanguageCode: 'en',
            createdAt,
        };

        res.json({ success: true, data: agent });
    } catch (error: any) {
        // Handle unique constraint violation
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ success: false, error: 'Agent with this ID already exists' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete agent configuration
router.delete('/:id', (req, res) => {
    try {
        const result = deleteAgentById.run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get agent intents (mock data - would use Dialogflow API in production)
router.get('/:id/intents', (req, res) => {
    const mockIntents = [
        { name: 'greeting.hello', displayName: 'Hello Greeting', trainingPhrases: ['hi', 'hello', 'hey'] },
        { name: 'greeting.goodbye', displayName: 'Goodbye', trainingPhrases: ['bye', 'goodbye', 'see you'] },
        { name: 'flight.booking', displayName: 'Book Flight', trainingPhrases: ['book a flight', 'I want to fly'] },
        { name: 'flight.status', displayName: 'Flight Status', trainingPhrases: ['flight status', 'check my flight'] },
        { name: 'order.status', displayName: 'Order Status', trainingPhrases: ['order status', 'where is my order'] },
    ];
    res.json({ success: true, data: mockIntents });
});

// Get agent pages (mock data - would use Dialogflow API in production)
router.get('/:id/pages', (req, res) => {
    const mockPages = [
        { name: 'Start Page', displayName: 'Start Page' },
        { name: 'Booking Flow', displayName: 'Booking Flow' },
        { name: 'Payment', displayName: 'Payment' },
        { name: 'Confirmation', displayName: 'Confirmation' },
        { name: 'End Session', displayName: 'End Session' },
    ];
    res.json({ success: true, data: mockPages });
});

export default router;
