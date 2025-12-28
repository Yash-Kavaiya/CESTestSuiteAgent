import client from './client';

export type CoverageType = 'INTENT' | 'PAGE_TRANSITION' | 'TRANSITION_ROUTE_GROUP';

export interface IntentCoverageData {
    coverageType: 'INTENT';
    coverageScore: number;
    totalIntents: number;
    coveredIntents: number;
    uncoveredIntents: number;
    coveragePercent: string;
    intents: Array<{
        name: string;
        displayName: string;
        covered: boolean;
    }>;
    uncoveredIntentsList: string[];
}

export interface PageTransitionCoverageData {
    coverageType: 'PAGE_TRANSITION';
    coverageScore: number;
    totalTransitions: number;
    coveredTransitions: number;
    uncoveredTransitions: number;
    coveragePercent: string;
    transitions: Array<{
        source: string;
        target: string;
        covered: boolean;
    }>;
}

export interface RouteGroupCoverageData {
    coverageType: 'TRANSITION_ROUTE_GROUP';
    coverageScore: number;
    totalRouteGroups: number;
    coveredRouteGroups: number;
    uncoveredRouteGroups: number;
    coveragePercent: string;
    routeGroups: Array<{
        name: string;
        displayName: string;
        covered: boolean;
    }>;
}

export type CoverageData = IntentCoverageData | PageTransitionCoverageData | RouteGroupCoverageData;

export interface AllCoverageData {
    agentId: string;
    intentCoverage: IntentCoverageData;
    pageTransitionCoverage: PageTransitionCoverageData;
    routeGroupCoverage: RouteGroupCoverageData;
}

export interface CoverageResponse {
    success: boolean;
    data?: CoverageData & { agentId: string };
    error?: string;
}

export interface AllCoverageResponse {
    success: boolean;
    data?: AllCoverageData;
    error?: string;
}

/**
 * Calculate coverage for a specific agent and coverage type
 */
export const calculateCoverage = async (
    agentId: string,
    type: CoverageType = 'INTENT'
): Promise<CoverageResponse> => {
    try {
        const response = await client.get(`/coverage/${agentId}`, {
            params: { type },
        });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || error.message || 'Failed to calculate coverage',
        };
    }
};

/**
 * Calculate all coverage types for an agent
 */
export const calculateAllCoverage = async (agentId: string): Promise<AllCoverageResponse> => {
    try {
        const response = await client.get(`/coverage/${agentId}/all`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || error.message || 'Failed to calculate all coverage',
        };
    }
};

export const coverageApi = {
    calculateCoverage,
    calculateAllCoverage,
};
