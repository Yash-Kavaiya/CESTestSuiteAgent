import { Router, Request, Response } from 'express';
import { v3beta1 } from '@google-cloud/dialogflow-cx';
import { geminiService, ConversationAnalysis, TranscriptTurn } from '../services/geminiService';
import { config } from '../config';
import { db } from '../database.js';

const router = Router();
const { ConversationHistoryClient } = v3beta1;

// Helper to get API endpoint based on location
function getApiEndpoint(location: string): string {
    return location === 'global' ? 'dialogflow.googleapis.com' : `${location}-dialogflow.googleapis.com`;
}

// Store analysis results in database
function initAnalysisTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS ai_analysis_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            agent_id TEXT NOT NULL,
            analysis_json TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_ai_analysis_session_id ON ai_analysis_results(session_id)
    `);
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_ai_analysis_agent_id ON ai_analysis_results(agent_id)
    `);
}

// Initialize table on module load
try {
    initAnalysisTable();
} catch (error) {
    console.error('Failed to initialize AI analysis table:', error);
}

// Helper function to convert conversation interactions to transcript format
function convertToTranscript(interactions: any[]): TranscriptTurn[] {
    const transcript: TranscriptTurn[] = [];

    for (const interaction of interactions) {
        // Extract user query from request.queryInput
        let userQuery = null;
        
        if (interaction.request?.queryInput) {
            const queryInput = interaction.request.queryInput;
            // Try different paths for user input
            userQuery = queryInput.text?.text ||
                       queryInput.intent?.intent ||
                       queryInput.event?.event ||
                       queryInput.dtmf?.digits ||
                       interaction.requestUtterances;
        }
        
        if (userQuery) {
            transcript.push({
                role: 'user',
                message: userQuery
            });
        }

        // Extract agent response from response.queryResult
        if (interaction.response?.queryResult) {
            const queryResult = interaction.response.queryResult;
            
            // Get response messages
            const responseMessages = queryResult.responseMessages || [];
            for (const msg of responseMessages) {
                let text = null;
                
                if (msg.text?.text) {
                    // Handle array of text
                    text = Array.isArray(msg.text.text) 
                        ? msg.text.text.join('\n') 
                        : msg.text.text;
                } else if (msg.payload) {
                    // Handle payload messages
                    text = JSON.stringify(msg.payload);
                }
                
                if (text) {
                    transcript.push({
                        role: 'agent',
                        message: text
                    });
                }
            }
            
            // Fallback to responseUtterances if no messages found
            if (responseMessages.length === 0 && interaction.responseUtterances) {
                transcript.push({
                    role: 'agent',
                    message: interaction.responseUtterances
                });
            }
        }
    }

    return transcript;
}

// GET /api/v1/ai-analysis/sessions - Get all sessions with basic info
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId, pageSize = 100, pageToken } = req.query;

        if (!projectId || !location || !agentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: projectId, location, agentId',
            });
        }

        const client = new ConversationHistoryClient({
            apiEndpoint: getApiEndpoint(location as string),
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });

        const parent = `projects/${projectId}/locations/${location}/agents/${agentId}`;

        const [conversations, , response] = await client.listConversations({
            parent,
            pageSize: parseInt(pageSize as string, 10),
            pageToken: pageToken as string || undefined,
        });

        // Get existing analysis status from database
        const existingAnalyses = db.prepare(`
            SELECT session_id FROM ai_analysis_results WHERE agent_id = ?
        `).all(agentId as string) as { session_id: string }[];
        const analyzedSessionIds = new Set(existingAnalyses.map(a => a.session_id));

        // Transform conversations to session list
        const sessions = conversations.map((conv) => {
            const sessionId = conv.name?.split('/').pop() || '';
            return {
                sessionId,
                name: conv.name,
                type: conv.type,
                languageCode: conv.languageCode,
                startTime: conv.startTime?.seconds
                    ? new Date(Number(conv.startTime.seconds) * 1000).toISOString()
                    : null,
                duration: conv.duration?.seconds ? `${conv.duration.seconds}s` : null,
                durationSeconds: conv.duration?.seconds ? Number(conv.duration.seconds) : 0,
                turnCount: conv.interactions?.length || 0,
                environment: conv.environment,
                hasAnalysis: analyzedSessionIds.has(sessionId),
                interactionCount: conv.metrics?.interactionCount || conv.interactions?.length || 0,
                avgMatchConfidence: conv.metrics?.averageMatchConfidence || 0,
            };
        });

        return res.json({
            success: true,
            data: {
                sessions,
                nextPageToken: response?.nextPageToken,
                totalCount: sessions.length,
            },
        });
    } catch (error: any) {
        console.error('List sessions error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to list sessions',
        });
    }
});

// GET /api/v1/ai-analysis/sessions/:sessionId/transcript - Get transcript for a session
router.get('/sessions/:sessionId/transcript', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { projectId, location, agentId } = req.query;

        if (!projectId || !location || !agentId || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
            });
        }

        const client = new ConversationHistoryClient({
            apiEndpoint: getApiEndpoint(location as string),
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });

        // Extract just the session ID if a full conversation name was provided
        const cleanSessionId = sessionId.includes('/') ? sessionId.split('/').pop() : sessionId;
        const name = `projects/${projectId}/locations/${location}/agents/${agentId}/conversations/${cleanSessionId}`;

        const [conversation] = await client.getConversation({ name });

        // Format interactions as transcript
        const interactions = conversation.interactions?.map((interaction, index) => ({
            turnNumber: index + 1,
            userInput: (interaction.request as any)?.query?.text ||
                (interaction.request as any)?.queryText || null,
            agentResponse: (interaction.response as any)?.responseMessages
                ?.map((msg: any) => msg.text?.text?.join('\n') || null)
                .filter(Boolean)
                .join('\n') || null,
            matchedIntent: (interaction.response as any)?.matchedIntent?.displayName || null,
            currentPage: (interaction.response as any)?.currentPage?.displayName || null,
            currentFlow: (interaction.response as any)?.currentFlow?.displayName || null,
        })) || [];

        // Convert to transcript format for Gemini
        const transcript = convertToTranscript(conversation.interactions || []);

        return res.json({
            success: true,
            data: {
                sessionId: cleanSessionId,
                startTime: conversation.startTime?.seconds
                    ? new Date(Number(conversation.startTime.seconds) * 1000).toISOString()
                    : null,
                duration: conversation.duration?.seconds ? `${conversation.duration.seconds}s` : null,
                interactions,
                transcript,
            },
        });
    } catch (error: any) {
        console.error('Get transcript error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get transcript',
        });
    }
});

// POST /api/v1/ai-analysis/analyze/:sessionId - Analyze a single session
router.post('/analyze/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { projectId, location, agentId } = req.query;

        console.log('Analyze session request:', { sessionId, projectId, location, agentId });

        if (!projectId || !location || !agentId || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: projectId, location, agentId, sessionId',
            });
        }

        // Check if Google Cloud credentials are configured
        if (!config.googleCloud.projectId || !config.googleCloud.credentialsPath) {
            return res.status(400).json({
                success: false,
                error: 'Google Cloud credentials not configured. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS in your .env file.',
            });
        }

        const client = new ConversationHistoryClient({
            apiEndpoint: getApiEndpoint(location as string),
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });

        // Extract just the session ID if a full conversation name was provided
        const cleanSessionId = sessionId.includes('/') ? sessionId.split('/').pop() : sessionId;
        const name = `projects/${projectId}/locations/${location}/agents/${agentId}/conversations/${cleanSessionId}`;

        console.log('Fetching conversation with name:', name);

        const [conversation] = await client.getConversation({ name });

        console.log('Conversation fetched:', {
            name: conversation.name,
            interactionsCount: conversation.interactions?.length || 0,
            hasInteractions: !!conversation.interactions,
            interactions: conversation.interactions
        });

        // Convert to transcript format
        const transcript = convertToTranscript(conversation.interactions || []);
        
        console.log('Transcript converted:', {
            transcriptLength: transcript.length,
            transcript: transcript.slice(0, 2) // Log first 2 turns for debugging
        });

        if (transcript.length === 0) {
            console.log('No transcript data available for session:', cleanSessionId);
            return res.status(400).json({
                success: false,
                error: 'No transcript data available for this session',
            });
        }

        console.log('Analyzing transcript with Gemini, turns:', transcript.length);

        // Analyze with Gemini - use cleanSessionId for consistency
        const analysis = await geminiService.analyzeTranscript(cleanSessionId!, transcript);

        console.log('Analysis completed successfully');

        // Store in database
        db.prepare(`
            INSERT OR REPLACE INTO ai_analysis_results (session_id, agent_id, analysis_json, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `).run(cleanSessionId, agentId as string, JSON.stringify(analysis));

        return res.json({
            success: true,
            data: analysis,
        });
    } catch (error: any) {
        console.error('Analyze session error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
        });
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze session',
        });
    }
});

// GET /api/v1/ai-analysis/results/:sessionId - Get stored analysis for a session
router.get('/results/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { agentId } = req.query;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID',
            });
        }

        let result;

        if (agentId) {
            result = db.prepare(`
                SELECT * FROM ai_analysis_results WHERE session_id = ? AND agent_id = ?
            `).get(sessionId, agentId as string) as any;
        } else {
            result = db.prepare(`
                SELECT * FROM ai_analysis_results WHERE session_id = ?
            `).get(sessionId) as any;
        }

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'No analysis found for this session',
            });
        }

        return res.json({
            success: true,
            data: JSON.parse(result.analysis_json),
        });
    } catch (error: any) {
        console.error('Get analysis result error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get analysis result',
        });
    }
});

// POST /api/v1/ai-analysis/bulk-analyze - Bulk analyze all or selected sessions
router.post('/bulk-analyze', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId } = req.query;
        const { sessionIds } = req.body; // Optional: specific sessions to analyze

        if (!projectId || !location || !agentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameters: projectId, location, agentId',
            });
        }

        // Check if Google Cloud credentials are configured
        if (!config.googleCloud.projectId || !config.googleCloud.credentialsPath) {
            return res.status(400).json({
                success: false,
                error: 'Google Cloud credentials not configured. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS in your .env file.',
            });
        }

        const client = new ConversationHistoryClient({
            apiEndpoint: getApiEndpoint(location as string),
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });

        const parent = `projects/${projectId}/locations/${location}/agents/${agentId}`;

        // Fetch all conversations
        const [conversations] = await client.listConversations({
            parent,
            pageSize: 100,
        });

        // Filter by sessionIds if provided
        let sessionsToAnalyze = conversations;
        if (sessionIds && Array.isArray(sessionIds) && sessionIds.length > 0) {
            sessionsToAnalyze = conversations.filter(conv => {
                const convId = conv.name?.split('/').pop();
                return sessionIds.includes(convId);
            });
        }

        // Prepare sessions with transcripts
        const sessionsWithTranscripts: Array<{ sessionId: string; transcript: TranscriptTurn[] }> = [];

        for (const conv of sessionsToAnalyze) {
            const sessionId = conv.name?.split('/').pop() || '';
            const transcript = convertToTranscript(conv.interactions || []);

            if (transcript.length > 0) {
                sessionsWithTranscripts.push({ sessionId, transcript });
            }
        }

        if (sessionsWithTranscripts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid sessions with transcript data found',
            });
        }

        // Analyze all sessions
        const analyses = await geminiService.bulkAnalyzeTranscripts(sessionsWithTranscripts);

        // Store all results in database
        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO ai_analysis_results (session_id, agent_id, analysis_json, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `);

        for (const analysis of analyses) {
            insertStmt.run(analysis.sessionId, agentId as string, JSON.stringify(analysis));
        }

        return res.json({
            success: true,
            data: {
                totalAnalyzed: analyses.length,
                analyses,
            },
        });
    } catch (error: any) {
        console.error('Bulk analyze error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to bulk analyze sessions',
        });
    }
});

// GET /api/v1/ai-analysis/export - Export all analyses as CSV
router.get('/export', async (req: Request, res: Response) => {
    try {
        const { agentId, format = 'csv' } = req.query;

        let results;

        if (agentId) {
            results = db.prepare(`
                SELECT * FROM ai_analysis_results WHERE agent_id = ? ORDER BY created_at DESC
            `).all(agentId as string) as any[];
        } else {
            results = db.prepare(`
                SELECT * FROM ai_analysis_results ORDER BY created_at DESC
            `).all() as any[];
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No analysis results found',
            });
        }

        const analyses: ConversationAnalysis[] = results.map(r => JSON.parse(r.analysis_json));

        if (format === 'json') {
            return res.json({
                success: true,
                data: analyses,
            });
        }

        // Generate CSV
        const csvContent = geminiService.generateCSVReport(analyses);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ai-analysis-export-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csvContent);
    } catch (error: any) {
        console.error('Export error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to export analyses',
        });
    }
});

// GET /api/v1/ai-analysis/summary - Get summary statistics of all analyses
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const { agentId } = req.query;

        let results;

        if (agentId) {
            results = db.prepare(`
                SELECT * FROM ai_analysis_results WHERE agent_id = ?
            `).all(agentId as string) as any[];
        } else {
            results = db.prepare(`
                SELECT * FROM ai_analysis_results
            `).all() as any[];
        }

        if (results.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalAnalyses: 0,
                    satisfactionDistribution: {},
                    sentimentDistribution: {},
                    avgSatisfactionScore: 0,
                    firstContactResolutionRate: 0,
                    escalationRate: 0,
                    topIssueCategories: [],
                    avgAgentPerformance: {},
                },
            });
        }

        const analyses: ConversationAnalysis[] = results.map(r => JSON.parse(r.analysis_json));

        // Calculate summary statistics
        const satisfactionDistribution: Record<string, number> = {};
        const sentimentDistribution: Record<string, number> = {};
        const issueCategories: Record<string, number> = {};
        let totalSatisfactionScore = 0;
        let fcrCount = 0;
        let escalationCount = 0;
        const agentPerformance = {
            professionalism: 0,
            empathy: 0,
            problemSolving: 0,
            communication: 0,
        };

        for (const analysis of analyses) {
            // Satisfaction distribution
            const level = analysis.customerSatisfaction?.level || 'unknown';
            satisfactionDistribution[level] = (satisfactionDistribution[level] || 0) + 1;
            totalSatisfactionScore += analysis.customerSatisfaction?.score || 0;

            // Sentiment distribution
            const sentiment = analysis.sentimentAnalysis?.overall || 'unknown';
            sentimentDistribution[sentiment] = (sentimentDistribution[sentiment] || 0) + 1;

            // Issue categories
            const category = analysis.additionalKPIs?.issueCategory || 'Unknown';
            issueCategories[category] = (issueCategories[category] || 0) + 1;

            // FCR and escalation
            if (analysis.additionalKPIs?.firstContactResolution) fcrCount++;
            if (analysis.additionalKPIs?.escalationRequired) escalationCount++;

            // Agent performance
            if (analysis.additionalKPIs?.agentPerformance) {
                agentPerformance.professionalism += analysis.additionalKPIs.agentPerformance.professionalism || 0;
                agentPerformance.empathy += analysis.additionalKPIs.agentPerformance.empathy || 0;
                agentPerformance.problemSolving += analysis.additionalKPIs.agentPerformance.problemSolving || 0;
                agentPerformance.communication += analysis.additionalKPIs.agentPerformance.communication || 0;
            }
        }

        const count = analyses.length;

        return res.json({
            success: true,
            data: {
                totalAnalyses: count,
                satisfactionDistribution,
                sentimentDistribution,
                avgSatisfactionScore: count > 0 ? totalSatisfactionScore / count : 0,
                firstContactResolutionRate: count > 0 ? (fcrCount / count) * 100 : 0,
                escalationRate: count > 0 ? (escalationCount / count) * 100 : 0,
                topIssueCategories: Object.entries(issueCategories)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([category, count]) => ({ category, count })),
                avgAgentPerformance: {
                    professionalism: count > 0 ? agentPerformance.professionalism / count : 0,
                    empathy: count > 0 ? agentPerformance.empathy / count : 0,
                    problemSolving: count > 0 ? agentPerformance.problemSolving / count : 0,
                    communication: count > 0 ? agentPerformance.communication / count : 0,
                },
            },
        });
    } catch (error: any) {
        console.error('Summary error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get summary',
        });
    }
});

// DELETE /api/v1/ai-analysis/results/:sessionId - Delete analysis for a session
router.delete('/results/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { agentId } = req.query;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID',
            });
        }

        if (agentId) {
            db.prepare(`
                DELETE FROM ai_analysis_results WHERE session_id = ? AND agent_id = ?
            `).run(sessionId, agentId as string);
        } else {
            db.prepare(`
                DELETE FROM ai_analysis_results WHERE session_id = ?
            `).run(sessionId);
        }

        return res.json({
            success: true,
            message: 'Analysis deleted successfully',
        });
    } catch (error: any) {
        console.error('Delete analysis error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete analysis',
        });
    }
});

export default router;
