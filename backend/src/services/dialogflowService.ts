import { SessionsClient } from '@google-cloud/dialogflow-cx';
import { config } from '../config.js';

interface DetectIntentParams {
    projectId: string;
    location: string;
    agentId: string;
    sessionId: string;
    text: string;
    languageCode?: string;
}

interface DetectIntentResult {
    responseText: string;
    matchedIntent: string | null;
    intentDisplayName: string | null;
    confidence: number;
    parameters: Record<string, unknown>;
    currentPage: string | null;
}

export class DialogflowService {
    private client: SessionsClient;

    constructor() {
        // Use Application Default Credentials (ADC) from Google Cloud SDK first
        // Falls back to service account file if GOOGLE_APPLICATION_CREDENTIALS is set
        const credentialsPath = config.googleCloud.credentialsPath;

        if (credentialsPath && credentialsPath.trim() !== '') {
            // Use explicit service account file
            console.log('Using service account credentials from:', credentialsPath);
            this.client = new SessionsClient({
                keyFilename: credentialsPath,
            });
        } else {
            // Use Application Default Credentials (gcloud auth application-default login)
            console.log('Using Application Default Credentials (Google Cloud SDK)');
            this.client = new SessionsClient();
        }
    }

    async detectIntent(params: DetectIntentParams): Promise<DetectIntentResult> {
        const { projectId, location, agentId, sessionId, text, languageCode = 'en' } = params;

        const sessionPath = this.client.projectLocationAgentSessionPath(
            projectId,
            location,
            agentId,
            sessionId
        );

        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text,
                },
                languageCode,
            },
        };

        try {
            const [response] = await this.client.detectIntent(request);
            const queryResult = response.queryResult;

            if (!queryResult) {
                throw new Error('No query result returned');
            }

            // Extract response messages
            const responseMessages = queryResult.responseMessages || [];
            const responseText = responseMessages
                .filter((msg) => msg.text)
                .map((msg) => msg.text?.text?.join(' ') || '')
                .join(' ');

            // Extract matched intent
            const matchedIntent = queryResult.match?.intent?.name || null;
            const intentDisplayName = queryResult.match?.intent?.displayName || null;
            const confidence = queryResult.match?.confidence || 0;

            // Extract parameters
            const parameters: Record<string, unknown> = {};
            if (queryResult.parameters?.fields) {
                Object.entries(queryResult.parameters.fields).forEach(([key, value]) => {
                    parameters[key] = this.extractValue(value);
                });
            }

            // Current page
            const currentPage = queryResult.currentPage?.displayName || null;

            return {
                responseText,
                matchedIntent,
                intentDisplayName,
                confidence,
                parameters,
                currentPage,
            };
        } catch (error: any) {
            console.error('Dialogflow API error:', error);
            throw new Error(`Failed to detect intent: ${error.message}`);
        }
    }

    private extractValue(value: any): unknown {
        if (!value) return null;

        if (value.stringValue !== undefined) return value.stringValue;
        if (value.numberValue !== undefined) return value.numberValue;
        if (value.boolValue !== undefined) return value.boolValue;
        if (value.listValue) {
            return value.listValue.values?.map((v: any) => this.extractValue(v)) || [];
        }
        if (value.structValue) {
            const result: Record<string, unknown> = {};
            Object.entries(value.structValue.fields || {}).forEach(([k, v]) => {
                result[k] = this.extractValue(v);
            });
            return result;
        }
        return null;
    }

    async listIntents(projectId: string, location: string, agentId: string) {
        // This would use IntentsClient to list all intents
        // For now, returning mock data
        return [
            { name: 'greeting.hello', displayName: 'Hello Greeting' },
            { name: 'greeting.goodbye', displayName: 'Goodbye' },
        ];
    }

    async listPages(projectId: string, location: string, agentId: string, flowId: string) {
        // This would use PagesClient to list all pages
        // For now, returning mock data
        return [
            { name: 'Start Page', displayName: 'Start Page' },
            { name: 'End Session', displayName: 'End Session' },
        ];
    }
}

export const dialogflowService = new DialogflowService();
