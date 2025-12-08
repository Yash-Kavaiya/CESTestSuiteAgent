import { Router } from 'express';

const router = Router();

// Mock results data
const mockResults = [
    {
        id: '1',
        runId: 'run-1',
        testCaseId: 'tc-1',
        conversationId: 'conv-001',
        turnNumber: 1,
        status: 'passed',
        userInput: 'I want to book a flight',
        expectedIntent: 'flight.booking',
        actualIntent: 'flight.booking',
        expectedResponse: 'Where would you like to go?',
        actualResponse: 'Where would you like to fly to?',
        intentMatched: true,
        responseMatched: true,
        parametersMatched: true,
        responseScore: 0.92,
        executionTimeMs: 145,
        createdAt: new Date().toISOString(),
    },
    {
        id: '2',
        runId: 'run-1',
        testCaseId: 'tc-2',
        conversationId: 'conv-002',
        turnNumber: 1,
        status: 'failed',
        userInput: 'Check my order status',
        expectedIntent: 'order.status',
        actualIntent: 'order.tracking',
        expectedResponse: 'Please provide your order number.',
        actualResponse: "I can help you track your order. What's the order ID?",
        intentMatched: false,
        responseMatched: false,
        parametersMatched: true,
        responseScore: 0.65,
        executionTimeMs: 234,
        createdAt: new Date().toISOString(),
    },
];

// List all results
router.get('/', (req, res) => {
    const { status, runId, page = 1, pageSize = 20 } = req.query;

    let filteredResults = [...mockResults];

    if (status && status !== 'all') {
        filteredResults = filteredResults.filter((r) => r.status === status);
    }
    if (runId) {
        filteredResults = filteredResults.filter((r) => r.runId === runId);
    }

    const startIndex = (Number(page) - 1) * Number(pageSize);
    const paginatedResults = filteredResults.slice(startIndex, startIndex + Number(pageSize));

    res.json({
        success: true,
        data: {
            items: paginatedResults,
            total: filteredResults.length,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(filteredResults.length / Number(pageSize)),
        },
    });
});

// Get single result
router.get('/:id', (req, res) => {
    const result = mockResults.find((r) => r.id === req.params.id);
    if (!result) {
        return res.status(404).json({ success: false, error: 'Result not found' });
    }
    res.json({ success: true, data: result });
});

// Export results
router.post('/export', (req, res) => {
    const { runId, format = 'csv', includeDetails = true } = req.body;

    // In a real implementation, this would generate the export file
    res.json({
        success: true,
        data: {
            downloadUrl: `/api/v1/results/download/${runId || 'all'}.${format}`,
            format,
            recordCount: mockResults.length,
        },
    });
});

export default router;
