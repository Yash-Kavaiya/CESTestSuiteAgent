import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface ConversationAnalysis {
    sessionId: string;
    situation: string;
    action: string;
    resolution: string;
    customerSatisfaction: {
        level: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';
        score: number; // 1-5
        explanation: string;
    };
    reasonForCancellation: string | null;
    entities: Array<{
        type: string;
        value: string;
        context: string;
    }>;
    sentimentAnalysis: {
        overall: 'positive' | 'negative' | 'neutral' | 'mixed';
        score: number; // -1 to 1
        progression: Array<{
            turn: number;
            sentiment: 'positive' | 'negative' | 'neutral';
            intensity: number;
        }>;
    };
    rootCauseAnalysis: {
        identified: boolean;
        primaryCause: string | null;
        contributingFactors: string[];
        callerIntention: string;
        systemIssues: string[];
    } | null;
    suggestedSolutions: string[] | null;
    additionalKPIs: {
        firstContactResolution: boolean;
        escalationRequired: boolean;
        transferCount: number;
        avgResponseTime: string;
        customerEffortScore: 'low' | 'medium' | 'high';
        agentPerformance: {
            professionalism: number; // 1-5
            empathy: number; // 1-5
            problemSolving: number; // 1-5
            communication: number; // 1-5
        };
        issueCategory: string;
        issueSubcategory: string;
        resolutionTime: string;
        followUpRequired: boolean;
    };
    summary: string;
    analyzedAt: string;
}

export interface TranscriptTurn {
    role: 'user' | 'agent';
    message: string;
    timestamp?: string;
}

class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    private initialize() {
        if (!this.genAI) {
            const apiKey = config.gemini.apiKey;
            if (!apiKey) {
                throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your .env file. Get your API key from https://aistudio.google.com/app/apikey');
            }

            console.log('Initializing Gemini with API key');
            this.genAI = new GoogleGenerativeAI(apiKey);

            const modelName = config.gemini.model || 'gemini-1.5-flash';
            console.log(`Using model: ${modelName}`);

            this.model = this.genAI.getGenerativeModel({ model: modelName });
        }
        return this.model;
    }

    async analyzeTranscript(sessionId: string, transcript: TranscriptTurn[]): Promise<ConversationAnalysis> {
        const model = this.initialize();

        const transcriptText = transcript
            .map((turn, index) => `[Turn ${index + 1}] ${turn.role.toUpperCase()}: ${turn.message}`)
            .join('\n');

        const prompt = `You are an expert customer service analyst. Analyze the following customer service conversation transcript and provide a comprehensive analysis.

TRANSCRIPT:
${transcriptText}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown or explanations):
{
    "situation": "What the customer needs help with or has questions about (be specific and detailed)",
    "action": "What actions the agent took to help the customer (list all key actions)",
    "resolution": "The final outcome/result of the customer service interaction",
    "customerSatisfaction": {
        "level": "very_satisfied|satisfied|neutral|dissatisfied|very_dissatisfied",
        "score": 1-5,
        "explanation": "Why you gave this satisfaction rating"
    },
    "reasonForCancellation": "If customer requested cancellation, explain the reason. Otherwise null",
    "entities": [
        {
            "type": "Entity type (e.g., product, account_number, date, location, person, etc.)",
            "value": "The extracted value",
            "context": "How it was used in the conversation"
        }
    ],
    "sentimentAnalysis": {
        "overall": "positive|negative|neutral|mixed",
        "score": -1 to 1 (decimal),
        "progression": [
            {
                "turn": 1,
                "sentiment": "positive|negative|neutral",
                "intensity": 0.0 to 1.0
            }
        ]
    },
    "rootCauseAnalysis": {
        "identified": true/false,
        "primaryCause": "Main root cause of the issue (if customer was not satisfied)",
        "contributingFactors": ["List of contributing factors"],
        "callerIntention": "What the caller really wanted to achieve",
        "systemIssues": ["Any system or process issues identified"]
    },
    "suggestedSolutions": ["If customer was not satisfied, provide actionable solutions to improve"],
    "additionalKPIs": {
        "firstContactResolution": true/false,
        "escalationRequired": true/false,
        "transferCount": 0,
        "avgResponseTime": "Estimated average response time",
        "customerEffortScore": "low|medium|high",
        "agentPerformance": {
            "professionalism": 1-5,
            "empathy": 1-5,
            "problemSolving": 1-5,
            "communication": 1-5
        },
        "issueCategory": "Main category of the issue",
        "issueSubcategory": "Subcategory of the issue",
        "resolutionTime": "Estimated resolution time",
        "followUpRequired": true/false
    },
    "summary": "A brief 2-3 sentence executive summary of the conversation"
}

Important guidelines:
1. If the customer was dissatisfied, provide detailed rootCauseAnalysis and suggestedSolutions
2. If the customer was satisfied, set rootCauseAnalysis to null and suggestedSolutions to null
3. Extract ALL relevant entities from the conversation
4. Track sentiment changes throughout the conversation
5. Be objective and data-driven in your analysis`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up the response - remove markdown code blocks if present
            let cleanedText = text.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.slice(7);
            }
            if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.slice(3);
            }
            if (cleanedText.endsWith('```')) {
                cleanedText = cleanedText.slice(0, -3);
            }
            cleanedText = cleanedText.trim();

            const analysis = JSON.parse(cleanedText);

            return {
                sessionId,
                ...analysis,
                analyzedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error analyzing transcript with Gemini:', error);

            // Provide more helpful error messages
            let errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
                errorMessage = 'Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file. Get a valid key from https://aistudio.google.com/app/apikey';
            } else if (errorMessage.includes('PERMISSION_DENIED')) {
                errorMessage = 'Permission denied. Please ensure your Gemini API key has proper permissions.';
            } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                errorMessage = 'API quota exceeded. Please wait a moment and try again, or upgrade your API plan.';
            }

            throw new Error(`Failed to analyze transcript: ${errorMessage}`);
        }
    }

    async bulkAnalyzeTranscripts(
        sessions: Array<{ sessionId: string; transcript: TranscriptTurn[] }>
    ): Promise<ConversationAnalysis[]> {
        const results: ConversationAnalysis[] = [];

        // Process in batches to avoid rate limiting
        const batchSize = 3; // Smaller batch for API key usage
        for (let i = 0; i < sessions.length; i += batchSize) {
            const batch = sessions.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (session) => {
                    try {
                        return await this.analyzeTranscript(session.sessionId, session.transcript);
                    } catch (error) {
                        console.error(`Error analyzing session ${session.sessionId}:`, error);
                        // Return a partial result with error info
                        return {
                            sessionId: session.sessionId,
                            situation: 'Analysis failed',
                            action: 'N/A',
                            resolution: 'Error during analysis',
                            customerSatisfaction: {
                                level: 'neutral' as const,
                                score: 0,
                                explanation: 'Analysis failed'
                            },
                            reasonForCancellation: null,
                            entities: [],
                            sentimentAnalysis: {
                                overall: 'neutral' as const,
                                score: 0,
                                progression: []
                            },
                            rootCauseAnalysis: null,
                            suggestedSolutions: null,
                            additionalKPIs: {
                                firstContactResolution: false,
                                escalationRequired: false,
                                transferCount: 0,
                                avgResponseTime: 'N/A',
                                customerEffortScore: 'medium' as const,
                                agentPerformance: {
                                    professionalism: 0,
                                    empathy: 0,
                                    problemSolving: 0,
                                    communication: 0
                                },
                                issueCategory: 'Error',
                                issueSubcategory: 'Analysis Failed',
                                resolutionTime: 'N/A',
                                followUpRequired: false
                            },
                            summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            analyzedAt: new Date().toISOString()
                        };
                    }
                })
            );
            results.push(...batchResults);

            // Add a small delay between batches to avoid rate limiting
            if (i + batchSize < sessions.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return results;
    }

    generateCSVReport(analyses: ConversationAnalysis[]): string {
        const headers = [
            'Session ID',
            'Situation',
            'Action',
            'Resolution',
            'Satisfaction Level',
            'Satisfaction Score',
            'Satisfaction Explanation',
            'Reason for Cancellation',
            'Entities',
            'Overall Sentiment',
            'Sentiment Score',
            'Root Cause Identified',
            'Primary Cause',
            'Contributing Factors',
            'Caller Intention',
            'System Issues',
            'Suggested Solutions',
            'First Contact Resolution',
            'Escalation Required',
            'Transfer Count',
            'Customer Effort Score',
            'Agent Professionalism',
            'Agent Empathy',
            'Agent Problem Solving',
            'Agent Communication',
            'Issue Category',
            'Issue Subcategory',
            'Follow-up Required',
            'Summary',
            'Analyzed At'
        ];

        const escapeCSV = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = analyses.map(analysis => [
            analysis.sessionId,
            analysis.situation,
            analysis.action,
            analysis.resolution,
            analysis.customerSatisfaction.level,
            analysis.customerSatisfaction.score,
            analysis.customerSatisfaction.explanation,
            analysis.reasonForCancellation || '',
            analysis.entities.map(e => `${e.type}: ${e.value}`).join('; '),
            analysis.sentimentAnalysis.overall,
            analysis.sentimentAnalysis.score,
            analysis.rootCauseAnalysis?.identified || false,
            analysis.rootCauseAnalysis?.primaryCause || '',
            analysis.rootCauseAnalysis?.contributingFactors?.join('; ') || '',
            analysis.rootCauseAnalysis?.callerIntention || '',
            analysis.rootCauseAnalysis?.systemIssues?.join('; ') || '',
            analysis.suggestedSolutions?.join('; ') || '',
            analysis.additionalKPIs.firstContactResolution,
            analysis.additionalKPIs.escalationRequired,
            analysis.additionalKPIs.transferCount,
            analysis.additionalKPIs.customerEffortScore,
            analysis.additionalKPIs.agentPerformance.professionalism,
            analysis.additionalKPIs.agentPerformance.empathy,
            analysis.additionalKPIs.agentPerformance.problemSolving,
            analysis.additionalKPIs.agentPerformance.communication,
            analysis.additionalKPIs.issueCategory,
            analysis.additionalKPIs.issueSubcategory,
            analysis.additionalKPIs.followUpRequired,
            analysis.summary,
            analysis.analyzedAt
        ].map(escapeCSV));

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}

export const geminiService = new GeminiService();
