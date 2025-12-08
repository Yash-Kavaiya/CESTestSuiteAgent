import axios from 'axios';
import { Agent } from '../types';

const API_BASE = '/api/v1/conversations';

export interface Conversation {
    name: string;
    id: string;
    type: 'AUDIO' | 'TEXT' | 'TYPE_UNSPECIFIED';
    languageCode: string;
    startTime: string | null;
    duration: string | null;
    turnCount: number;
    environment: string;
}

export interface ConversationInteraction {
    turnNumber: number;
    request: {
        queryText: string | null;
        input: any;
    };
    response: {
        responseMessages: { text: string | null; payload: any }[];
        matchedIntent: { name: string; displayName: string } | null;
        currentPage: { name: string; displayName: string } | null;
        currentFlow: { name: string; displayName: string } | null;
    };
}

export interface ConversationDetail extends Omit<Conversation, 'turnCount'> {
    interactions: ConversationInteraction[];
    uniqueIntents: string[];
    uniquePages: string[];
}

export interface CoverageAnalytics {
    totalConversations: number;
    uniqueIntents: string[];
    uniquePages: string[];
    intentCounts: Record<string, number>;
    pageCounts: Record<string, number>;
    intentCount: number;
    pageCount: number;
}

export const conversationsApi = {
    /**
     * List conversations for an agent
     */
    async list(agent: Agent, pageSize = 50, pageToken?: string): Promise<{
        success: boolean;
        data?: {
            conversations: Conversation[];
            nextPageToken?: string;
            totalCount: number;
        };
        error?: string;
    }> {
        const params = new URLSearchParams({
            projectId: agent.projectId,
            location: agent.location,
            agentId: agent.id,
            pageSize: pageSize.toString(),
        });
        if (pageToken) params.append('pageToken', pageToken);

        const response = await axios.get(`${API_BASE}?${params.toString()}`);
        return response.data;
    },

    /**
     * Get single conversation details
     */
    async get(agent: Agent, conversationId: string): Promise<{
        success: boolean;
        data?: ConversationDetail;
        error?: string;
    }> {
        const params = new URLSearchParams({
            projectId: agent.projectId,
            location: agent.location,
            agentId: agent.id,
        });

        const response = await axios.get(`${API_BASE}/${conversationId}?${params.toString()}`);
        return response.data;
    },

    /**
     * Delete a conversation
     */
    async delete(agent: Agent, conversationId: string): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }> {
        const params = new URLSearchParams({
            projectId: agent.projectId,
            location: agent.location,
            agentId: agent.id,
        });

        const response = await axios.delete(`${API_BASE}/${conversationId}?${params.toString()}`);
        return response.data;
    },

    /**
     * Get coverage analytics from conversations
     */
    async getCoverageAnalytics(agent: Agent, limit = 100): Promise<{
        success: boolean;
        data?: CoverageAnalytics;
        error?: string;
    }> {
        const params = new URLSearchParams({
            projectId: agent.projectId,
            location: agent.location,
            agentId: agent.id,
            limit: limit.toString(),
        });

        const response = await axios.get(`${API_BASE}/analytics/coverage?${params.toString()}`);
        return response.data;
    },
};
