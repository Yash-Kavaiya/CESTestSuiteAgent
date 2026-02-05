import { Router, Request, Response } from 'express';
import { v3beta1 } from '@google-cloud/dialogflow-cx';
import { config } from '../config.js';

const router = Router();

// Use the v3beta1 ConversationHistoryClient
const { ConversationHistoryClient } = v3beta1;

// Helper to get API endpoint based on location
function getApiEndpoint(location: string): string {
    return location === 'global' ? 'dialogflow.googleapis.com' : `${location}-dialogflow.googleapis.com`;
}

// List all conversations for an agent
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId, pageSize = 50, pageToken, startTimeMin, startTimeMax } = req.query;

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

        // Build filter string for date range
        let filter: string | undefined;
        const filterParts: string[] = [];

        if (startTimeMin) {
            filterParts.push(`start_time >= "${startTimeMin}"`);
        }
        if (startTimeMax) {
            filterParts.push(`start_time <= "${startTimeMax}"`);
        }

        if (filterParts.length > 0) {
            filter = filterParts.join(' AND ');
        }

        const [conversations, , response] = await client.listConversations({
            parent,
            pageSize: parseInt(pageSize as string, 10),
            pageToken: pageToken as string || undefined,
            filter,
        });

        // Transform conversations to a cleaner format
        const formattedConversations = conversations.map((conv) => ({
            name: conv.name,
            id: conv.name?.split('/').pop(),
            type: conv.type,
            languageCode: conv.languageCode,
            startTime: conv.startTime?.seconds
                ? new Date(Number(conv.startTime.seconds) * 1000).toISOString()
                : null,
            duration: conv.duration?.seconds ? `${conv.duration.seconds}s` : null,
            turnCount: conv.interactions?.length || 0,
            environment: conv.environment,
        }));

        return res.json({
            success: true,
            data: {
                conversations: formattedConversations,
                nextPageToken: response?.nextPageToken,
                totalCount: formattedConversations.length,
            },
        });
    } catch (error: any) {
        console.error('List conversations error:', error.message);

        // Handle specific error cases
        if (error.code === 7) {
            return res.status(403).json({
                success: false,
                error: 'Permission denied. Ensure the service account has Dialogflow API access.',
            });
        }

        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to list conversations',
        });
    }
});

// Get a single conversation with full details
router.get('/:conversationId', async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const { projectId, location, agentId } = req.query;

        if (!projectId || !location || !agentId || !conversationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
            });
        }

        const client = new ConversationHistoryClient({
            apiEndpoint: getApiEndpoint(location as string),
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });

        const name = `projects/${projectId}/locations/${location}/agents/${agentId}/conversations/${conversationId}`;

        const [conversation] = await client.getConversation({ name });

        // Format interactions for the frontend
        const interactions = conversation.interactions?.map((interaction, index) => ({
            turnNumber: index + 1,
            request: {
                queryText: (interaction.request as any)?.query?.text || null,
                input: (interaction.request as any)?.query,
            },
            response: {
                responseMessages: (interaction.response as any)?.responseMessages?.map((msg: any) => ({
                    text: msg.text?.text?.join('\n') || null,
                    payload: msg.payload || null,
                })),
                matchedIntent: (interaction.response as any)?.matchedIntent ? {
                    name: (interaction.response as any).matchedIntent.intent,
                    displayName: (interaction.response as any).matchedIntent.displayName,
                } : null,
                currentPage: (interaction.response as any)?.currentPage ? {
                    name: (interaction.response as any).currentPage.name,
                    displayName: (interaction.response as any).currentPage.displayName,
                } : null,
                currentFlow: (interaction.response as any)?.currentFlow ? {
                    name: (interaction.response as any).currentFlow.name,
                    displayName: (interaction.response as any).currentFlow.displayName,
                } : null,
            },
        })) || [];

        return res.json({
            success: true,
            data: {
                name: conversation.name,
                id: conversation.name?.split('/').pop(),
                type: conversation.type,
                languageCode: conversation.languageCode,
                startTime: conversation.startTime?.seconds
                    ? new Date(Number(conversation.startTime.seconds) * 1000).toISOString()
                    : null,
                duration: conversation.duration?.seconds ? `${conversation.duration.seconds}s` : null,
                environment: conversation.environment,
                interactions,
                // Extract unique intents and pages for coverage
                uniqueIntents: [...new Set(interactions
                    .filter((i) => i.response.matchedIntent?.displayName)
                    .map((i) => i.response.matchedIntent?.displayName))],
                uniquePages: [...new Set(interactions
                    .filter((i) => i.response.currentPage?.displayName)
                    .map((i) => i.response.currentPage?.displayName))],
            },
        });
    } catch (error: any) {
        console.error('Get conversation error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get conversation',
        });
    }
});

// Delete a conversation
router.delete('/:conversationId', async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const { projectId, location, agentId } = req.query;

        if (!projectId || !location || !agentId || !conversationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
            });
        }

        const client = new ConversationHistoryClient({
            apiEndpoint: getApiEndpoint(location as string),
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });

        const name = `projects/${projectId}/locations/${location}/agents/${agentId}/conversations/${conversationId}`;

        await client.deleteConversation({ name });

        return res.json({
            success: true,
            message: 'Conversation deleted successfully',
        });
    } catch (error: any) {
        console.error('Delete conversation error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete conversation',
        });
    }
});

// Get dashboard metrics from conversations
router.get('/analytics/dashboard', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId, limit = 50, startTimeMin, startTimeMax } = req.query;

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

        // Build filter string for date range
        let filter: string | undefined;
        const filterParts: string[] = [];

        if (startTimeMin) {
            filterParts.push(`start_time >= "${startTimeMin}"`);
        }
        if (startTimeMax) {
            filterParts.push(`start_time <= "${startTimeMax}"`);
        }

        if (filterParts.length > 0) {
            filter = filterParts.join(' AND ');
        }

        // Fetch conversations
        const [conversations] = await client.listConversations({
            parent,
            pageSize: parseInt(limit as string, 10),
            filter,
        });

        // Initialize aggregated metrics
        let totalInteractions = 0;
        let totalMatchConfidence = 0;
        let matchConfidenceCount = 0;
        let completedConversations = 0;
        let handoffConversations = 0;
        let totalDurationSeconds = 0;
        let durationCount = 0;
        let maxWebhookLatencyMs = 0;

        const matchTypeCounts = {
            intentCount: 0,
            directIntentCount: 0,
            parameterFillingCount: 0,
            noMatchCount: 0,
            noInputCount: 0,
            eventCount: 0,
        };
        const missingTransitions: Array<{
            conversationId: string;
            intentDisplayName: string;
            score: number;
        }> = [];
        const stepMetricsAggregated: Record<string, { totalLatencyMs: number; count: number }> = {};
        const recentConversations: any[] = [];
        const intentCounts: Record<string, number> = {};
        const pageCounts: Record<string, number> = {};

        for (const conv of conversations) {
            const convId = conv.name?.split('/').pop() || '';
            const convMetrics = conv.metrics;

            // Aggregate metrics from conversation.metrics
            if (convMetrics) {
                totalInteractions += convMetrics.interactionCount || 0;

                if (convMetrics.averageMatchConfidence) {
                    totalMatchConfidence += convMetrics.averageMatchConfidence;
                    matchConfidenceCount++;
                }

                // Track completion and handoff
                if (convMetrics.hasEndInteraction) {
                    completedConversations++;
                }
                if (convMetrics.hasLiveAgentHandoff) {
                    handoffConversations++;
                }

                // Track max webhook latency
                if (convMetrics.maxWebhookLatency?.seconds) {
                    const webhookLatencyMs = Number(convMetrics.maxWebhookLatency.seconds) * 1000 +
                        (convMetrics.maxWebhookLatency.nanos || 0) / 1e6;
                    if (webhookLatencyMs > maxWebhookLatencyMs) {
                        maxWebhookLatencyMs = webhookLatencyMs;
                    }
                }

                // Aggregate match type counts
                const mtc = convMetrics.matchTypeCount;
                if (mtc) {
                    matchTypeCounts.intentCount += mtc.intentCount || 0;
                    matchTypeCounts.directIntentCount += mtc.directIntentCount || 0;
                    matchTypeCounts.parameterFillingCount += mtc.parameterFillingCount || 0;
                    matchTypeCounts.noMatchCount += mtc.noMatchCount || 0;
                    matchTypeCounts.noInputCount += mtc.noInputCount || 0;
                    matchTypeCounts.eventCount += mtc.eventCount || 0;
                }
            }

            // Track duration
            if (conv.duration?.seconds) {
                totalDurationSeconds += Number(conv.duration.seconds);
                durationCount++;
            }

            // Get intents and pages from conversation
            if (conv.intents) {
                for (const intent of conv.intents) {
                    const intentName = intent.displayName || 'Unknown';
                    intentCounts[intentName] = (intentCounts[intentName] || 0) + 1;
                }
            }
            if (conv.pages) {
                for (const page of conv.pages) {
                    const pageName = page.displayName || 'Unknown';
                    pageCounts[pageName] = (pageCounts[pageName] || 0) + 1;
                }
            }

            // Process interactions for missing transitions and step metrics
            if (conv.interactions) {
                for (const interaction of conv.interactions) {
                    // Collect missing transitions
                    const mt = (interaction as any).missingTransition;
                    if (mt && mt.intentDisplayName) {
                        missingTransitions.push({
                            conversationId: convId,
                            intentDisplayName: mt.intentDisplayName,
                            score: mt.score || 0,
                        });
                    }

                    // Aggregate step metrics
                    const stepMetrics = (interaction as any).stepMetrics;
                    if (stepMetrics && Array.isArray(stepMetrics)) {
                        for (const step of stepMetrics) {
                            const stepName = step.name || 'unknown';
                            const latencyMs = step.latency?.seconds
                                ? Number(step.latency.seconds) * 1000 + (step.latency.nanos || 0) / 1e6
                                : 0;

                            if (!stepMetricsAggregated[stepName]) {
                                stepMetricsAggregated[stepName] = { totalLatencyMs: 0, count: 0 };
                            }
                            stepMetricsAggregated[stepName].totalLatencyMs += latencyMs;
                            stepMetricsAggregated[stepName].count++;
                        }
                    }
                }
            }

            // Add to recent conversations (limit to 10)
            if (recentConversations.length < 10) {
                recentConversations.push({
                    id: convId,
                    type: conv.type,
                    startTime: conv.startTime?.seconds
                        ? new Date(Number(conv.startTime.seconds) * 1000).toISOString()
                        : null,
                    duration: conv.duration?.seconds ? `${conv.duration.seconds}s` : null,
                    durationSeconds: conv.duration?.seconds ? Number(conv.duration.seconds) : 0,
                    interactionCount: convMetrics?.interactionCount || 0,
                    avgMatchConfidence: convMetrics?.averageMatchConfidence || 0,
                    hasEndInteraction: convMetrics?.hasEndInteraction || false,
                    hasLiveAgentHandoff: convMetrics?.hasLiveAgentHandoff || false,
                });
            }
        }

        // Calculate averages and rates
        const avgMatchConfidence = matchConfidenceCount > 0
            ? totalMatchConfidence / matchConfidenceCount
            : 0;
        const completionRate = conversations.length > 0
            ? completedConversations / conversations.length
            : 0;
        const handoffRate = conversations.length > 0
            ? handoffConversations / conversations.length
            : 0;
        const avgDurationSeconds = durationCount > 0
            ? totalDurationSeconds / durationCount
            : 0;
        const avgTurnsPerConversation = conversations.length > 0
            ? totalInteractions / conversations.length
            : 0;

        // Format step metrics
        const stepMetricsSummary = Object.entries(stepMetricsAggregated).map(([name, data]) => ({
            name,
            avgLatencyMs: data.count > 0 ? data.totalLatencyMs / data.count : 0,
            totalCalls: data.count,
        }));

        // Sort and get top intents/pages
        const topIntents = Object.entries(intentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
        const topPages = Object.entries(pageCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Sort missing transitions by score (highest first)
        missingTransitions.sort((a, b) => b.score - a.score);

        return res.json({
            success: true,
            data: {
                // Core metrics
                totalConversations: conversations.length,
                totalInteractions,
                avgMatchConfidence,
                matchTypeCounts,

                // New KPIs
                completionRate,
                handoffRate,
                avgDurationSeconds,
                avgTurnsPerConversation,
                maxWebhookLatencyMs,

                // Top items
                topIntents,
                topPages,

                // Detailed data
                missingTransitions: missingTransitions.slice(0, 20),
                stepMetrics: stepMetricsSummary,
                recentConversations,
            },
        });
    } catch (error: any) {
        console.error('Dashboard analytics error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get dashboard analytics',
        });
    }
});

// Get aggregated coverage data from recent conversations
router.get('/analytics/coverage', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId, limit = 100, startTimeMin, startTimeMax } = req.query;

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

        // Build filter string for date range
        let filter: string | undefined;
        const filterParts: string[] = [];

        if (startTimeMin) {
            filterParts.push(`start_time >= "${startTimeMin}"`);
        }
        if (startTimeMax) {
            filterParts.push(`start_time <= "${startTimeMax}"`);
        }

        if (filterParts.length > 0) {
            filter = filterParts.join(' AND ');
        }

        // Fetch conversations
        const [conversations] = await client.listConversations({
            parent,
            pageSize: parseInt(limit as string, 10),
            filter,
        });

        // Aggregate intents and pages from all conversations
        const allIntents = new Set<string>();
        const allPages = new Set<string>();
        const intentCounts: Record<string, number> = {};
        const pageCounts: Record<string, number> = {};

        for (const conv of conversations) {
            if (conv.interactions) {
                for (const interaction of conv.interactions) {
                    const intent = (interaction.response as any)?.matchedIntent?.displayName;
                    const page = (interaction.response as any)?.currentPage?.displayName;

                    if (intent) {
                        allIntents.add(intent);
                        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
                    }
                    if (page) {
                        allPages.add(page);
                        pageCounts[page] = (pageCounts[page] || 0) + 1;
                    }
                }
            }
        }

        return res.json({
            success: true,
            data: {
                totalConversations: conversations.length,
                uniqueIntents: Array.from(allIntents),
                uniquePages: Array.from(allPages),
                intentCounts,
                pageCounts,
                intentCount: allIntents.size,
                pageCount: allPages.size,
            },
        });
    } catch (error: any) {
        console.error('Coverage analytics error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get coverage analytics',
        });
    }
});

export default router;

