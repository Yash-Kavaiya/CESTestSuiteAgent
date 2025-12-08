import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory storage for demo
const agents = new Map<string, any>();

// List all agents
router.get('/', (req, res) => {
    const allAgents = Array.from(agents.values());
    res.json({ success: true, data: allAgents });
});

// Get agent details
router.get('/:id', (req, res) => {
    const agent = agents.get(req.params.id);
    if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agent });
});

// Add agent configuration
router.post('/', (req, res) => {
    const { projectId, location, agentId, displayName } = req.body;

    if (!projectId || !agentId || !displayName) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: projectId, agentId, displayName',
        });
    }

    const agent = {
        id: agentId,
        displayName,
        projectId,
        location: location || 'us-central1',
        defaultLanguageCode: 'en',
        createdAt: new Date().toISOString(),
    };

    agents.set(agentId, agent);
    res.json({ success: true, data: agent });
});

// Delete agent configuration
router.delete('/:id', (req, res) => {
    if (!agents.has(req.params.id)) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    agents.delete(req.params.id);
    res.json({ success: true });
});

// Get agent intents (mock data)
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

// Get agent pages (mock data)
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
