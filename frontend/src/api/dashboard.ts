import axios from 'axios';
import { Agent } from '../types';
import { createLogger } from '../utils/logger';

const API_BASE = '/api/v1/conversations';
const logger = createLogger('dashboardApi');

export interface MatchTypeCounts {
    intentCount: number;
    directIntentCount: number;
    parameterFillingCount: number;
    noMatchCount: number;
    noInputCount: number;
    eventCount: number;
}

export interface MissingTransition {
    conversationId: string;
    intentDisplayName: string;
    score: number;
}

export interface StepMetric {
    name: string;
    avgLatencyMs: number;
    totalCalls: number;
}

export interface TopItem {
    name: string;
    count: number;
}

export interface RecentConversation {
    id: string;
    type: string;
    startTime: string | null;
    duration: string | null;
    durationSeconds: number;
    interactionCount: number;
    avgMatchConfidence: number;
    hasEndInteraction: boolean;
    hasLiveAgentHandoff: boolean;
}

export interface DashboardMetrics {
    // Core metrics
    totalConversations: number;
    totalInteractions: number;
    avgMatchConfidence: number;
    matchTypeCounts: MatchTypeCounts;

    // New KPIs
    completionRate: number;
    handoffRate: number;
    avgDurationSeconds: number;
    avgTurnsPerConversation: number;
    maxWebhookLatencyMs: number;

    // Top items
    topIntents: TopItem[];
    topPages: TopItem[];

    // Detailed data
    missingTransitions: MissingTransition[];
    stepMetrics: StepMetric[];
    recentConversations: RecentConversation[];
}

export const dashboardApi = {
    /**
     * Get dashboard analytics for an agent
     */
    async getDashboardMetrics(agent: Agent, limit = 50): Promise<{
        success: boolean;
        data?: DashboardMetrics;
        error?: string;
    }> {
        try {
            // Clamp limit between 1 and 1000
            const validLimit = Math.max(1, Math.min(limit, 1000));

            logger.debug('Fetching dashboard metrics', {
                agentId: agent.id,
                projectId: agent.projectId,
                limit: validLimit,
            });

            const response = await axios.get(`${API_BASE}/analytics/dashboard`, {
                params: {
                    projectId: agent.projectId,
                    location: agent.location,
                    agentId: agent.id,
                    limit: validLimit,
                },
            });

            logger.info('Dashboard metrics fetched successfully', {
                agentId: agent.id,
                totalConversations: response.data.data?.totalConversations,
            });

            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard metrics';

            logger.error('Failed to fetch dashboard metrics', {
                agentId: agent.id,
                error: errorMessage,
            });

            return {
                success: false,
                error: errorMessage,
            };
        }
    },
};
