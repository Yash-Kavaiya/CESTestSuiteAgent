import client from './client';
import { TestCase, TestConversation, ApiResponse, PaginatedResponse } from '../types';

export const testCasesApi = {
    // Create single test case
    create: async (testCase: Partial<TestCase>): Promise<ApiResponse<TestCase>> => {
        const { data } = await client.post('/test-cases', testCase);
        return data;
    },

    // Create bulk test cases from parsed CSV
    createBulk: async (
        conversations: TestConversation[]
    ): Promise<ApiResponse<{ created: number; testCases: TestCase[] }>> => {
        const { data } = await client.post('/test-cases/bulk', { conversations });
        return data;
    },

    // Upload CSV file
    uploadCSV: async (
        file: File
    ): Promise<ApiResponse<{ conversations: TestConversation[]; warnings: string[] }>> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await client.post('/test-cases/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },

    // List all test cases
    list: async (params?: {
        page?: number;
        pageSize?: number;
        search?: string;
        tags?: string[];
    }): Promise<ApiResponse<PaginatedResponse<TestCase>>> => {
        const { data } = await client.get('/test-cases', { params });
        return data;
    },

    // Get single test case
    get: async (id: string): Promise<ApiResponse<TestCase>> => {
        const { data } = await client.get(`/test-cases/${id}`);
        return data;
    },

    // Update test case
    update: async (
        id: string,
        updates: Partial<TestCase>
    ): Promise<ApiResponse<TestCase>> => {
        const { data } = await client.put(`/test-cases/${id}`, updates);
        return data;
    },

    // Delete test case
    delete: async (id: string): Promise<ApiResponse<void>> => {
        const { data } = await client.delete(`/test-cases/${id}`);
        return data;
    },

    // Batch delete
    deleteBulk: async (ids: string[]): Promise<ApiResponse<{ deleted: number }>> => {
        const { data } = await client.post('/test-cases/bulk-delete', { ids });
        return data;
    },
};

export default testCasesApi;
