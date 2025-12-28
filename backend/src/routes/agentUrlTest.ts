import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface UrlTestConfig {
    id: string;
    name: string;
    url: string;
    testSteps: TestStep[];
    createdAt: string;
    updatedAt: string;
}

interface TestStep {
    id: string;
    action: 'navigate' | 'click' | 'type' | 'screenshot' | 'wait' | 'assert';
    selector?: string;
    value?: string;
    timeout?: number;
    description: string;
}

interface TestResult {
    id: string;
    configId: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    steps: StepResult[];
    screenshots: string[];
    startedAt: string;
    completedAt?: string;
    error?: string;
}

interface StepResult {
    stepId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    screenshot?: string;
    error?: string;
}

// In-memory storage (replace with database in production)
const testConfigs: Map<string, UrlTestConfig> = new Map();
const testResults: Map<string, TestResult> = new Map();

// Create a new URL test configuration
router.post('/configs', async (req: Request, res: Response) => {
    try {
        const { name, url, testSteps } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, url',
            });
        }

        const config: UrlTestConfig = {
            id: uuidv4(),
            name,
            url,
            testSteps: testSteps || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        testConfigs.set(config.id, config);

        return res.json({
            success: true,
            data: config,
        });
    } catch (error: any) {
        console.error('Error creating URL test config:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create test configuration',
        });
    }
});

// Get all URL test configurations
router.get('/configs', async (req: Request, res: Response) => {
    try {
        const configs = Array.from(testConfigs.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return res.json({
            success: true,
            data: configs,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch configurations',
        });
    }
});

// Get a specific URL test configuration
router.get('/configs/:id', async (req: Request, res: Response) => {
    try {
        const config = testConfigs.get(req.params.id);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuration not found',
            });
        }

        return res.json({
            success: true,
            data: config,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch configuration',
        });
    }
});

// Update a URL test configuration
router.put('/configs/:id', async (req: Request, res: Response) => {
    try {
        const config = testConfigs.get(req.params.id);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuration not found',
            });
        }

        const { name, url, testSteps } = req.body;

        const updatedConfig: UrlTestConfig = {
            ...config,
            name: name || config.name,
            url: url || config.url,
            testSteps: testSteps || config.testSteps,
            updatedAt: new Date().toISOString(),
        };

        testConfigs.set(config.id, updatedConfig);

        return res.json({
            success: true,
            data: updatedConfig,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update configuration',
        });
    }
});

// Delete a URL test configuration
router.delete('/configs/:id', async (req: Request, res: Response) => {
    try {
        const deleted = testConfigs.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Configuration not found',
            });
        }

        return res.json({
            success: true,
            message: 'Configuration deleted successfully',
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete configuration',
        });
    }
});

// Run a URL test
router.post('/run/:configId', async (req: Request, res: Response) => {
    try {
        const config = testConfigs.get(req.params.configId);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuration not found',
            });
        }

        const testResult: TestResult = {
            id: uuidv4(),
            configId: config.id,
            status: 'pending',
            steps: [],
            screenshots: [],
            startedAt: new Date().toISOString(),
        };

        testResults.set(testResult.id, testResult);

        // Note: Actual browser automation would be handled by a separate service
        // using Google ADK Computer Use with Playwright
        // This endpoint returns the test ID for status polling

        // Simulate test execution (replace with actual Playwright integration)
        simulateTestExecution(testResult.id, config);

        return res.json({
            success: true,
            data: {
                testId: testResult.id,
                status: 'pending',
                message: 'Test started. Poll /status/:testId for updates.',
            },
        });
    } catch (error: any) {
        console.error('Error running URL test:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to start test',
        });
    }
});

// Quick test - run a URL test without saving configuration
router.post('/quick-test', async (req: Request, res: Response) => {
    try {
        const { url, testSteps } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: url',
            });
        }

        const tempConfig: UrlTestConfig = {
            id: `temp-${uuidv4()}`,
            name: 'Quick Test',
            url,
            testSteps: testSteps || [
                { id: '1', action: 'navigate', value: url, description: 'Navigate to URL' },
                { id: '2', action: 'screenshot', description: 'Take screenshot' },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const testResult: TestResult = {
            id: uuidv4(),
            configId: tempConfig.id,
            status: 'pending',
            steps: [],
            screenshots: [],
            startedAt: new Date().toISOString(),
        };

        testResults.set(testResult.id, testResult);

        // Simulate test execution
        simulateTestExecution(testResult.id, tempConfig);

        return res.json({
            success: true,
            data: {
                testId: testResult.id,
                status: 'pending',
                message: 'Quick test started. Poll /status/:testId for updates.',
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to start quick test',
        });
    }
});

// Get test status
router.get('/status/:testId', async (req: Request, res: Response) => {
    try {
        const result = testResults.get(req.params.testId);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Test result not found',
            });
        }

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch test status',
        });
    }
});

// Get all test results
router.get('/results', async (req: Request, res: Response) => {
    try {
        const { configId, limit = 50 } = req.query;

        let results = Array.from(testResults.values());

        if (configId) {
            results = results.filter((r) => r.configId === configId);
        }

        results = results
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
            .slice(0, Number(limit));

        return res.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch results',
        });
    }
});

// Simulate test execution (placeholder for actual Playwright/ADK integration)
async function simulateTestExecution(testId: string, config: UrlTestConfig) {
    const result = testResults.get(testId);
    if (!result) return;

    result.status = 'running';
    testResults.set(testId, result);

    // Simulate step execution
    setTimeout(() => {
        const updatedResult = testResults.get(testId);
        if (!updatedResult) return;

        updatedResult.status = 'passed';
        updatedResult.completedAt = new Date().toISOString();
        updatedResult.steps = config.testSteps.map((step) => ({
            stepId: step.id,
            status: 'passed' as const,
            duration: Math.random() * 1000 + 500,
        }));
        updatedResult.screenshots = [`screenshot_${testId}_1.png`];

        testResults.set(testId, updatedResult);
    }, 3000);
}

export default router;
