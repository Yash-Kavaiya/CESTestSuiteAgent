import axios from 'axios';

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

interface HuggingFaceFeature {
    name: string;
    type: string | { dtype?: string };
}

interface HuggingFaceRow {
    row: Record<string, unknown>;
}

interface HuggingFaceResponse {
    rows: HuggingFaceRow[];
    num_rows_total: number;
    num_rows_per_page: number;
}

class HuggingFaceService {
    private readonly HF_API_BASE = 'https://datasets-server.huggingface.co';

    // Predefined adversarial datasets for responsible AI testing
    readonly PRESET_DATASETS: DatasetInfo[] = [
        {
            id: 'deepset/prompt-injections',
            name: 'Prompt Injections (Deepset)',
            description: 'Collection of prompt injection attacks designed to manipulate AI systems',
            category: 'prompt_injection',
            sampleCount: 662
        },
        {
            id: 'JasperLS/prompt-injections',
            name: 'Prompt Injections (JasperLS)',
            description: 'Diverse prompt injection examples for testing AI robustness',
            category: 'prompt_injection',
            sampleCount: 546
        },
        {
            id: 'rubend18/ChatGPT-Jailbreak-Prompts',
            name: 'ChatGPT Jailbreak Prompts',
            description: 'Collection of jailbreak prompts used to bypass AI safety measures',
            category: 'jailbreak',
            sampleCount: 79
        },
        {
            id: 'Harelix/Prompt-Injection-Mixed-Techniques-2024',
            name: 'Mixed Injection Techniques 2024',
            description: 'Advanced prompt injection using various manipulation techniques',
            category: 'prompt_injection',
            sampleCount: 300
        },
        {
            id: 'markush1/LLM-Jailbreak-Classifier',
            name: 'LLM Jailbreak Classifier Dataset',
            description: 'Labeled jailbreak attempts for classification and testing',
            category: 'jailbreak',
            sampleCount: 1000
        }
    ];

    /**
     * Get list of preset adversarial datasets
     */
    listPresetDatasets(): DatasetInfo[] {
        return this.PRESET_DATASETS;
    }

    /**
     * Fetch samples from a HuggingFace dataset
     */
    async getDatasetSamples(datasetId: string, limit: number = 100): Promise<DatasetSample[]> {
        try {
            // Find the text column name for this dataset
            const textColumn = await this.findTextColumn(datasetId);
            if (!textColumn) {
                throw new Error(`Could not find text column in dataset ${datasetId}`);
            }

            // Fetch rows from the dataset
            const url = `${this.HF_API_BASE}/rows?dataset=${encodeURIComponent(datasetId)}&config=default&split=train&offset=0&length=${limit}`;

            const response = await axios.get<HuggingFaceResponse>(url, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.data.rows || response.data.rows.length === 0) {
                // Try with 'test' split if 'train' is empty
                const testUrl = `${this.HF_API_BASE}/rows?dataset=${encodeURIComponent(datasetId)}&config=default&split=test&offset=0&length=${limit}`;
                const testResponse = await axios.get<HuggingFaceResponse>(testUrl, {
                    timeout: 30000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!testResponse.data.rows || testResponse.data.rows.length === 0) {
                    throw new Error(`No data found in dataset ${datasetId}`);
                }

                return this.parseRows(testResponse.data.rows, textColumn, datasetId);
            }

            return this.parseRows(response.data.rows, textColumn, datasetId);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    throw new Error(`Dataset ${datasetId} not found on HuggingFace`);
                }
                throw new Error(`Failed to fetch dataset: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Find the text column name in a dataset
     */
    private async findTextColumn(datasetId: string): Promise<string | null> {
        try {
            const url = `${this.HF_API_BASE}/first-rows?dataset=${encodeURIComponent(datasetId)}&config=default&split=train`;
            const response = await axios.get(url, { timeout: 15000 });

            if (response.data.features) {
                // Look for common text column names
                const textColumnNames = ['text', 'prompt', 'input', 'question', 'content', 'message', 'query', 'instruction'];
                const features = response.data.features;

                for (const colName of textColumnNames) {
                    if (features.some((f: HuggingFaceFeature) => f.name.toLowerCase() === colName)) {
                        return colName;
                    }
                }

                // If no common name found, use the first string column
                const stringFeature = features.find((f: HuggingFaceFeature) => {
                    if (typeof f.type === 'string') {
                        return f.type === 'string';
                    }
                    return f.type?.dtype === 'string';
                });
                if (stringFeature) {
                    return stringFeature.name;
                }
            }

            // Fallback to 'text' as default
            return 'text';
        } catch {
            return 'text';
        }
    }

    /**
     * Parse HuggingFace rows into DatasetSample format
     */
    private parseRows(rows: HuggingFaceRow[], textColumn: string, datasetId: string): DatasetSample[] {
        const preset = this.PRESET_DATASETS.find(d => d.id === datasetId);
        const defaultCategory = preset?.category || 'prompt_injection';

        return rows
            .map(row => {
                const text = row.row[textColumn];
                if (typeof text !== 'string' || !text.trim()) {
                    return null;
                }

                // Try to extract category from row if available
                let category = defaultCategory;
                if (row.row['category'] && typeof row.row['category'] === 'string') {
                    category = row.row['category'];
                } else if (row.row['label'] && typeof row.row['label'] === 'string') {
                    category = row.row['label'];
                } else if (row.row['type'] && typeof row.row['type'] === 'string') {
                    category = row.row['type'];
                }

                return {
                    text: text.trim(),
                    category,
                    metadata: row.row
                };
            })
            .filter((sample): sample is DatasetSample => sample !== null);
    }

    /**
     * Validate a custom HuggingFace dataset
     */
    async validateCustomDataset(datasetId: string): Promise<DatasetInfo | null> {
        try {
            const url = `${this.HF_API_BASE}/info?dataset=${encodeURIComponent(datasetId)}`;
            const response = await axios.get(url, { timeout: 15000 });

            if (response.data && response.data.dataset_info) {
                const info = response.data.dataset_info;
                const splits = info.splits || {};
                const trainSplit = splits.train || splits.test || Object.values(splits)[0];
                const sampleCount = trainSplit?.num_examples || 0;

                return {
                    id: datasetId,
                    name: datasetId.split('/').pop() || datasetId,
                    description: info.description || 'Custom HuggingFace dataset',
                    category: 'prompt_injection', // Default category for custom datasets
                    sampleCount
                };
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * Parse custom CSV content into DatasetSamples
     * Expected format: prompt,category
     */
    parseCSV(csvContent: string): DatasetSample[] {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const samples: DatasetSample[] = [];

        // Skip header if present
        const startIndex = lines[0]?.toLowerCase().includes('prompt') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle CSV with commas in quoted strings
            const match = line.match(/^"?([^"]*)"?,\s*"?([^"]*)"?$/);
            if (match) {
                samples.push({
                    text: match[1].trim(),
                    category: match[2]?.trim() || 'custom'
                });
            } else {
                // Simple split for unquoted content
                const parts = line.split(',');
                if (parts.length >= 1) {
                    samples.push({
                        text: parts[0].trim(),
                        category: parts[1]?.trim() || 'custom'
                    });
                }
            }
        }

        return samples;
    }
}

export const huggingFaceService = new HuggingFaceService();
