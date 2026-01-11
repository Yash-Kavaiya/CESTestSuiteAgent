import { Router, Request, Response } from 'express';
import { SessionsClient } from '@google-cloud/dialogflow-cx';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// @ts-ignore
import { Parser } from 'json2csv';

// Detect intent - real-time simulator endpoint
router.post('/detect-intent', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId, sessionId, text, languageCode = 'en' } = req.body;

        if (!projectId || !agentId || !sessionId || !text) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, agentId, sessionId, text',
            });
        }

        // Create Dialogflow CX Sessions client
        const client = new SessionsClient({
            apiEndpoint: location === 'global' ? 'dialogflow.googleapis.com' : `${location}-dialogflow.googleapis.com`,
        });

        // Build session path
        const sessionPath = client.projectLocationAgentSessionPath(
            projectId,
            location,
            agentId,
            sessionId
        );

        // Build the request
        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: text,
                },
                languageCode: languageCode,
            },
            queryParams: {
                analyzeQueryTextSentiment: true,
            },
        };

        // Call Dialogflow CX API
        const [response] = await client.detectIntent(request);

        // Extract response data
        const queryResult = response.queryResult;

        // Get text responses
        const textResponses: string[] = [];
        if (queryResult?.responseMessages) {
            for (const msg of queryResult.responseMessages) {
                if (msg.text?.text) {
                    textResponses.push(...msg.text.text);
                }
            }
        }

        // Build response object
        const result = {
            responseText: textResponses.join('\n') || 'No response from agent',
            matchedIntent: queryResult?.intent?.name || null,
            intentDisplayName: queryResult?.intent?.displayName || null,
            confidence: queryResult?.intentDetectionConfidence || 0,
            parameters: queryResult?.parameters?.fields
                ? Object.fromEntries(
                    Object.entries(queryResult.parameters.fields).map(([k, v]) => [k, v])
                )
                : {},
            currentPage: queryResult?.currentPage?.displayName || null,
            currentFlow: queryResult?.currentFlow?.displayName || null,
            sentiment: (queryResult as any)?.sentimentAnalysisResult?.sentiment
                ? {
                    score: (queryResult as any).sentimentAnalysisResult.sentiment.score || 0,
                    magnitude: (queryResult as any).sentimentAnalysisResult.sentiment.magnitude || 0,
                }
                : null,
            diagnosticInfo: queryResult?.diagnosticInfo || null,
            match: queryResult?.match
                ? {
                    matchType: queryResult.match.matchType,
                    confidence: queryResult.match.confidence,
                    event: queryResult.match.event,
                }
                : null,
        };

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Dialogflow API error:', error.message);

        // Check for specific error types
        if (error.code === 7) {
            return res.status(403).json({
                success: false,
                error: 'Permission denied. Please check your Google Cloud credentials and ensure the Dialogflow API is enabled.',
            });
        }

        if (error.code === 5) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found. Please verify your Project ID, Location, and Agent ID.',
            });
        }

        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to connect to Dialogflow agent',
        });
    }
});

// Get session history (for future use)
router.get('/session/:sessionId', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            sessionId: req.params.sessionId,
            status: 'active',
            createdAt: new Date().toISOString(),
        },
    });
});

// Delete/reset session
router.delete('/session/:sessionId', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: `Session ${req.params.sessionId} has been reset`,
    });
});

// Test connection to agent
router.post('/test-connection', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId } = req.body;

        if (!projectId || !agentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, agentId',
            });
        }

        // Create Dialogflow CX Sessions client
        const client = new SessionsClient({
            apiEndpoint: location === 'global' ? 'dialogflow.googleapis.com' : `${location}-dialogflow.googleapis.com`,
        });

        // Try to detect intent with a simple test
        const testSessionId = `test-${uuidv4()}`;
        const sessionPath = client.projectLocationAgentSessionPath(
            projectId,
            location || 'global',
            agentId,
            testSessionId
        );

        const [response] = await client.detectIntent({
            session: sessionPath,
            queryInput: {
                text: { text: 'test' },
                languageCode: 'en',
            },
        });

        return res.json({
            success: true,
            data: {
                connected: true,
                agentName: response.queryResult?.currentFlow?.displayName || 'Unknown',
                startPage: response.queryResult?.currentPage?.displayName || 'Start Page',
            },
        });
    } catch (error: any) {
        console.error('Connection test error:', error.message);
        return res.status(400).json({
            success: false,
            error: error.message || 'Failed to connect to agent',
        });
    }
});

export default router;
