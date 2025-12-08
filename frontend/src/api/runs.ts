import client from './client';
import { TestRun, TestResult, ApiResponse, TestConversation } from '../types';

export const runsApi = {
    // Run single test
    runSingle: async (params: {
        agentId: string;
        userInput: string;
        expectedIntent?: string;
        expectedResponse?: string;
        expectedParameters?: Record<string, unknown>;
        sessionId?: string;
    }): Promise<ApiResponse<TestResult>> => {
        const { data } = await client.post('/runs/single', params);
        return data;
    },

    // Run batch tests
    runBatch: async (params: {
        agentId: string;
        conversations: TestConversation[];
        name?: string;
        concurrency?: number;
    }): Promise<ApiResponse<TestRun>> => {
        const { data } = await client.post('/runs/batch', params);
        return data;
    },

    // Get run status
    getStatus: async (runId: string): Promise<ApiResponse<TestRun>> => {
        const { data } = await client.get(`/runs/${runId}`);
        return data;
    },

    // Get run results
    getResults: async (
        runId: string,
        params?: { page?: number; pageSize?: number; status?: string }
    ): Promise<ApiResponse<{ run: TestRun; results: TestResult[] }>> => {
        const { data } = await client.get(`/runs/${runId}/results`, { params });
        return data;
    },

    // Cancel running batch
    cancel: async (runId: string): Promise<ApiResponse<TestRun>> => {
        const { data } = await client.post(`/runs/${runId}/cancel`);
        return data;
    },

    // List all runs
    list: async (params?: {
        page?: number;
        pageSize?: number;
        status?: string;
    }): Promise<ApiResponse<TestRun[]>> => {
        const { data } = await client.get('/runs', { params });
        return data;
    },

    // Get run coverage stats
    getCoverage: async (runId: string): Promise<any> => {
        const { data } = await client.get(`/runs/${runId}/coverage`);
        return data;
    },

    // Stream run progress (using Server-Sent Events)
    streamProgress: (runId: string, onProgress: (data: TestRun) => void) => {
        const eventSource = new EventSource(`/api/v1/runs/${runId}/stream`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onProgress(data);
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    },
};

export default runsApi;
