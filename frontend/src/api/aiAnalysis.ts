import client from './client';

export interface ConversationSession {
    sessionId: string;
    name: string;
    type: string;
    languageCode: string;
    startTime: string | null;
    duration: string | null;
    durationSeconds: number;
    turnCount: number;
    environment: string;
    hasAnalysis: boolean;
    interactionCount: number;
    avgMatchConfidence: number;
}

export interface TranscriptTurn {
    role: 'user' | 'agent';
    message: string;
    timestamp?: string;
}

export interface TranscriptData {
    sessionId: string;
    startTime: string | null;
    duration: string | null;
    interactions: any[];
    transcript: TranscriptTurn[];
}

export interface CustomerSatisfaction {
    level: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';
    score: number;
    explanation: string;
}

export interface SentimentAnalysis {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed';
    score: number;
    progression: Array<{
        turn: number;
        sentiment: 'positive' | 'negative' | 'neutral';
        intensity: number;
    }>;
}

export interface RootCauseAnalysis {
    identified: boolean;
    primaryCause: string | null;
    contributingFactors: string[];
    callerIntention: string;
    systemIssues: string[];
}

export interface AgentPerformance {
    professionalism: number;
    empathy: number;
    problemSolving: number;
    communication: number;
}

export interface AdditionalKPIs {
    firstContactResolution: boolean;
    escalationRequired: boolean;
    transferCount: number;
    avgResponseTime: string;
    customerEffortScore: 'low' | 'medium' | 'high';
    agentPerformance: AgentPerformance;
    issueCategory: string;
    issueSubcategory: string;
    resolutionTime: string;
    followUpRequired: boolean;
}

export interface ConversationAnalysis {
    sessionId: string;
    situation: string;
    action: string;
    resolution: string;
    customerSatisfaction: CustomerSatisfaction;
    reasonForCancellation: string | null;
    entities: Array<{
        type: string;
        value: string;
        context: string;
    }>;
    sentimentAnalysis: SentimentAnalysis;
    rootCauseAnalysis: RootCauseAnalysis | null;
    suggestedSolutions: string[] | null;
    additionalKPIs: AdditionalKPIs;
    summary: string;
    analyzedAt: string;
}

export interface AnalysisSummary {
    totalAnalyses: number;
    satisfactionDistribution: Record<string, number>;
    sentimentDistribution: Record<string, number>;
    avgSatisfactionScore: number;
    firstContactResolutionRate: number;
    escalationRate: number;
    topIssueCategories: Array<{ category: string; count: number }>;
    avgAgentPerformance: AgentPerformance;
}

export const aiAnalysisApi = {
    // Get all conversation sessions
    getSessions: async (
        projectId: string,
        location: string,
        agentId: string,
        pageSize: number = 100,
        pageToken?: string
    ) => {
        const params = new URLSearchParams({
            projectId,
            location,
            agentId,
            pageSize: pageSize.toString(),
        });
        if (pageToken) params.append('pageToken', pageToken);

        const response = await client.get(
            `/ai-analysis/sessions?${params.toString()}`
        );
        return response.data.data as {
            sessions: ConversationSession[];
            nextPageToken?: string;
            totalCount: number;
        };
    },

    // Get transcript for a session
    getTranscript: async (
        sessionId: string,
        projectId: string,
        location: string,
        agentId: string
    ) => {
        const params = new URLSearchParams({
            projectId,
            location,
            agentId,
        });

        const response = await client.get(
            `/ai-analysis/sessions/${sessionId}/transcript?${params.toString()}`
        );
        return response.data.data as TranscriptData;
    },

    // Analyze a single session
    analyzeSession: async (
        sessionId: string,
        projectId: string,
        location: string,
        agentId: string
    ) => {
        const params = new URLSearchParams({
            projectId,
            location,
            agentId,
        });

        const response = await client.post(
            `/ai-analysis/analyze/${sessionId}?${params.toString()}`,
            {}
        );
        return response.data.data as ConversationAnalysis;
    },

    // Get stored analysis for a session
    getAnalysisResult: async (sessionId: string, agentId?: string) => {
        let url = `/ai-analysis/results/${sessionId}`;
        if (agentId) {
            url += `?agentId=${agentId}`;
        }

        const response = await client.get(url);
        return response.data.data as ConversationAnalysis;
    },

    // Bulk analyze sessions
    bulkAnalyze: async (
        projectId: string,
        location: string,
        agentId: string,
        sessionIds?: string[]
    ) => {
        const params = new URLSearchParams({
            projectId,
            location,
            agentId,
        });

        const response = await client.post(
            `/ai-analysis/bulk-analyze?${params.toString()}`,
            { sessionIds }
        );
        return response.data.data as {
            totalAnalyzed: number;
            analyses: ConversationAnalysis[];
        };
    },

    // Export analyses as CSV
    exportAnalyses: async (agentId?: string, format: 'csv' | 'json' = 'csv') => {
        let url = `/ai-analysis/export?format=${format}`;
        if (agentId) {
            url += `&agentId=${agentId}`;
        }

        if (format === 'csv') {
            const response = await fetch(`${client.defaults.baseURL}${url}`, {
                method: 'GET',
            });
            const blob = await response.blob();
            return blob;
        } else {
            const response = await client.get(url);
            return response.data as ConversationAnalysis[];
        }
    },

    // Get summary statistics
    getSummary: async (agentId?: string) => {
        let url = '/ai-analysis/summary';
        if (agentId) {
            url += `?agentId=${agentId}`;
        }

        const response = await client.get(url);
        return response.data.data as AnalysisSummary;
    },

    // Delete analysis for a session
    deleteAnalysis: async (sessionId: string, agentId?: string) => {
        let url = `/ai-analysis/results/${sessionId}`;
        if (agentId) {
            url += `?agentId=${agentId}`;
        }

        const response = await client.delete(url);
        return response.data as { message: string };
    },
};
