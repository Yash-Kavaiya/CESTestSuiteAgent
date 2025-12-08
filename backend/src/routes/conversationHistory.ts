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
        const { projectId, location, agentId, pageSize = 50, pageToken } = req.query;

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
                queryText: interaction.request?.query?.text || null,
                input: interaction.request?.query,
            },
            response: {
                responseMessages: interaction.response?.responseMessages?.map((msg) => ({
                    text: msg.text?.text?.join('\n') || null,
                    payload: msg.payload || null,
                })),
                matchedIntent: interaction.response?.matchedIntent ? {
                    name: interaction.response.matchedIntent.intent,
                    displayName: interaction.response.matchedIntent.displayName,
                } : null,
                currentPage: interaction.response?.currentPage ? {
                    name: interaction.response.currentPage.name,
                    displayName: interaction.response.currentPage.displayName,
                } : null,
                currentFlow: interaction.response?.currentFlow ? {
                    name: interaction.response.currentFlow.name,
                    displayName: interaction.response.currentFlow.displayName,
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

// Get aggregated coverage data from recent conversations
router.get('/analytics/coverage', async (req: Request, res: Response) => {
    try {
        const { projectId, location, agentId, limit = 100 } = req.query;

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

        // Fetch conversations
        const [conversations] = await client.listConversations({
            parent,
            pageSize: parseInt(limit as string, 10),
        });

        // Aggregate intents and pages from all conversations
        const allIntents = new Set<string>();
        const allPages = new Set<string>();
        const intentCounts: Record<string, number> = {};
        const pageCounts: Record<string, number> = {};

        for (const conv of conversations) {
            if (conv.interactions) {
                for (const interaction of conv.interactions) {
                    const intent = interaction.response?.matchedIntent?.displayName;
                    const page = interaction.response?.currentPage?.displayName;

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
