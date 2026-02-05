import client from './client';

// Dataset interfaces
export interface DatasetInfo {
    id: string;
    name: string;
    description: string;
    category: 'prompt_injection' | 'jailbreak' | 'harmful_content' | 'pii_extraction';
    sampleCount: number;
}

export interface DatasetSample {
    text: string;
    category: string;
    metadata?: Record<string, unknown>;
}

// Test configuration
export interface RAITestConfig {
    agentId: string;
    projectId: string;
    location: string;
    datasetId?: string;
    sampleSize: number;
    categories: string[];
    customPrompts?: DatasetSample[];
}

// Test result interfaces
export interface RAITestAnalysis {
    followedIntent: boolean;
    leakedSystemPrompt: boolean;
    producedHarmfulContent: boolean;
    bypassedSafeguards: boolean;
    explanation: string;
}

export interface RAITestResult {
    id: string;
    promptText: string;
    category: string;
    agentResponse: string;
    isVulnerable: boolean;
    safetyScore: number;
    analysis: RAITestAnalysis;
    executionTimeMs: number;
}

export interface CategoryBreakdown {
    total: number;
    vulnerable: number;
    avgSafetyScore: number;
}

export interface TopVulnerability {
    prompt: string;
    category: string;
    safetyScore: number;
}

export interface RAITestSummary {
    totalTests: number;
    passed: number;
    failed: number;
    vulnerabilityScore: number;
    avgSafetyScore: number;
    categoryBreakdown: Record<string, CategoryBreakdown>;
    topVulnerabilities: TopVulnerability[];
    recommendations: string[];
}

export interface RAITestJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    results: RAITestResult[];
    summary?: RAITestSummary;
    error?: string;
    startedAt?: string;
    completedAt?: string;
}

export const responsibleAIApi = {
    // Get available preset datasets
    getDatasets: async (): Promise<DatasetInfo[]> => {
        const response = await client.get('/responsible-ai/datasets');
        return response.data.data;
    },

    // Validate a custom HuggingFace dataset
    validateDataset: async (datasetId: string): Promise<DatasetInfo | null> => {
        try {
            const response = await client.post('/responsible-ai/datasets/validate', { datasetId });
            return response.data.data;
        } catch (error: any) {
            console.warn(`Dataset validation failed for '${datasetId}':`, error.response?.data?.error || error.message);
            return null;
        }
    },

    // Get preview samples from a dataset
    getDatasetPreview: async (datasetId: string, limit: number = 10): Promise<DatasetSample[]> => {
        const response = await client.post('/responsible-ai/datasets/preview', { datasetId, limit });
        return response.data.data;
    },

    // Upload custom prompts via CSV
    uploadCustomPrompts: async (file: File): Promise<{ samples: DatasetSample[]; count: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/responsible-ai/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    // Start a new RAI test
    startTest: async (config: RAITestConfig): Promise<{ jobId: string }> => {
        const response = await client.post('/responsible-ai/test', config);
        return response.data.data;
    },

    // Get job status (for polling)
    getJobStatus: async (jobId: string): Promise<RAITestJob> => {
        const response = await client.get(`/responsible-ai/test/${jobId}`);
        return response.data.data;
    },

    // Get detailed results
    getJobResults: async (jobId: string): Promise<{ results: RAITestResult[]; summary: RAITestSummary }> => {
        const response = await client.get(`/responsible-ai/test/${jobId}/results`);
        return response.data.data;
    },

    // Get test history for an agent
    getHistory: async (agentId: string): Promise<RAITestJob[]> => {
        const response = await client.get(`/responsible-ai/history?agentId=${encodeURIComponent(agentId)}`);
        return response.data.data;
    },

    // Export results as CSV
    exportResults: async (jobId: string): Promise<Blob> => {
        const response = await fetch(`${client.defaults.baseURL}/responsible-ai/export/${jobId}`, {
            method: 'GET',
        });
        return await response.blob();
    },
};
