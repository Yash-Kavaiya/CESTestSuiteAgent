import client from './client';
import { CoverageMetrics, TestTrend, DashboardMetrics, ApiResponse } from '../types';

export const analyticsApi = {
    // Get dashboard metrics
    getDashboard: async (
        agentId?: string
    ): Promise<ApiResponse<DashboardMetrics>> => {
        const { data } = await client.get('/analytics/dashboard', {
            params: { agentId },
        });
        return data;
    },

    // Get coverage metrics
    getCoverage: async (
        agentId: string
    ): Promise<ApiResponse<CoverageMetrics>> => {
        const { data } = await client.get('/analytics/coverage', {
            params: { agentId },
        });
        return data;
    },

    // Get trend data
    getTrends: async (params: {
        agentId?: string;
        period?: 'day' | 'week' | 'month';
        limit?: number;
    }): Promise<ApiResponse<TestTrend[]>> => {
        const { data } = await client.get('/analytics/trends', { params });
        return data;
    },

    // Get failure analysis
    getFailures: async (params: {
        agentId?: string;
        runId?: string;
        limit?: number;
    }): Promise<
        ApiResponse<{
            byIntent: Array<{ intent: string; count: number }>;
            byPage: Array<{ page: string; count: number }>;
            byType: Array<{ type: string; count: number }>;
        }>
    > => {
        const { data } = await client.get('/analytics/failures', { params });
        return data;
    },

    // Export results
    exportResults: async (params: {
        runId?: string;
        format: 'csv' | 'json' | 'excel';
        includeDetails?: boolean;
    }): Promise<Blob> => {
        const { data } = await client.get('/results/export', {
            params,
            responseType: 'blob',
        });
        return data;
    },
};

export default analyticsApi;
