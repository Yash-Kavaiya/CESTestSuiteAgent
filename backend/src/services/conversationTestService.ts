import { TestCasesClient } from '@google-cloud/dialogflow-cx';
import { config } from '../config.js';

export interface ConversationTurn {
    userInput?: {
        input: {
            text?: { text: string };
            event?: { event: string };
        };
        injectedParameters?: Record<string, unknown>;
        isWebhookEnabled?: boolean;
    };
    virtualAgentOutput?: {
        triggeredIntent?: { name: string; displayName: string };
        currentPage?: { name: string; displayName: string };
        textResponses?: Array<{ text: string[] }>;
        sessionParameters?: Record<string, unknown>;
    };
}

export interface TestCaseData {
    displayName: string;
    tags?: string[];
    notes?: string;
    testConfig?: {
        trackingParameters?: string[];
        flow?: string;
        page?: string;
    };
    testCaseConversationTurns: ConversationTurn[];
}

export interface TestCaseResult {
    name: string;
    testResult: 'PASSED' | 'FAILED' | 'TEST_RESULT_UNSPECIFIED';
    conversationTurns: ConversationTurn[];
    testTime: string;
}

export class ConversationTestService {
    private client: TestCasesClient;
    private projectId: string;
    private location: string;

    constructor() {
        this.client = new TestCasesClient({
            keyFilename: config.googleCloud.credentialsPath || undefined,
        });
        this.projectId = config.googleCloud.projectId;
        this.location = config.googleCloud.dialogflowLocation;
    }

    /**
     * Get the agent path for API calls
     */
    private getAgentPath(agentId: string): string {
        return `projects/${this.projectId}/locations/${this.location}/agents/${agentId}`;
    }

    /**
     * Create a test case in Dialogflow CX
     */
    async createTestCase(agentId: string, testCase: TestCaseData): Promise<any> {
        const parent = this.getAgentPath(agentId);

        try {
            const [response] = await this.client.createTestCase({
                parent,
                testCase: {
                    displayName: testCase.displayName,
                    tags: testCase.tags,
                    notes: testCase.notes,
                    testConfig: testCase.testConfig,
                    testCaseConversationTurns: testCase.testCaseConversationTurns,
                },
            });

            return response;
        } catch (error: any) {
            console.error('Error creating test case:', error);
            throw new Error(`Failed to create test case: ${error.message}`);
        }
    }

    /**
     * List all test cases for an agent
     */
    async listTestCases(agentId: string, pageSize = 100): Promise<any[]> {
        const parent = this.getAgentPath(agentId);
        const testCases: any[] = [];

        try {
            const iterable = this.client.listTestCasesAsync({
                parent,
                pageSize,
            });

            for await (const testCase of iterable) {
                testCases.push(testCase);
            }

            return testCases;
        } catch (error: any) {
            console.error('Error listing test cases:', error);
            throw new Error(`Failed to list test cases: ${error.message}`);
        }
    }

    /**
     * Run a single test case
     */
    async runTestCase(testCaseName: string, environment?: string): Promise<TestCaseResult> {
        try {
            const [operation] = await this.client.runTestCase({
                name: testCaseName,
                environment,
            });

            // Wait for the operation to complete
            const [response] = await operation.promise();

            return {
                name: (response as any).name || testCaseName,
                testResult: (response as any).result?.testResult || 'TEST_RESULT_UNSPECIFIED',
                conversationTurns: (response as any).result?.conversationTurns || [],
                testTime: (response as any).result?.testTime || new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('Error running test case:', error);
            throw new Error(`Failed to run test case: ${error.message}`);
        }
    }

    /**
     * Batch run multiple test cases
     */
    async batchRunTestCases(
        agentId: string,
        testCaseNames: string[],
        environment?: string
    ): Promise<TestCaseResult[]> {
        const parent = this.getAgentPath(agentId);

        try {
            const [operation] = await this.client.batchRunTestCases({
                parent,
                testCases: testCaseNames,
                environment,
            });

            // Wait for the operation to complete
            const [response] = await operation.promise();

            return ((response as any).results || []).map((result: any) => ({
                name: result.name,
                testResult: result.testResult || 'TEST_RESULT_UNSPECIFIED',
                conversationTurns: result.conversationTurns || [],
                testTime: result.testTime || new Date().toISOString(),
            }));
        } catch (error: any) {
            console.error('Error batch running test cases:', error);
            throw new Error(`Failed to batch run test cases: ${error.message}`);
        }
    }

    /**
     * Get test case details
     */
    async getTestCase(testCaseName: string): Promise<any> {
        try {
            const [response] = await this.client.getTestCase({
                name: testCaseName,
            });

            return response;
        } catch (error: any) {
            console.error('Error getting test case:', error);
            throw new Error(`Failed to get test case: ${error.message}`);
        }
    }

    /**
     * Delete test cases
     */
    async batchDeleteTestCases(agentId: string, testCaseNames: string[]): Promise<void> {
        const parent = this.getAgentPath(agentId);

        try {
            await this.client.batchDeleteTestCases({
                parent,
                names: testCaseNames,
            });
        } catch (error: any) {
            console.error('Error deleting test cases:', error);
            throw new Error(`Failed to delete test cases: ${error.message}`);
        }
    }

    /**
     * Calculate coverage for an agent
     */
    async calculateCoverage(
        agentId: string,
        type: 'INTENT' | 'PAGE_TRANSITION' | 'TRANSITION_ROUTE_GROUP'
    ): Promise<any> {
        const parent = this.getAgentPath(agentId);

        try {
            const [response] = await this.client.calculateCoverage({
                agent: parent,
                type,
            });

            // Parse and enhance the response based on coverage type
            return this.parseCoverageResponse(response, type);
        } catch (error: any) {
            console.error('Error calculating coverage:', error);
            throw new Error(`Failed to calculate coverage: ${error.message}`);
        }
    }

    /**
     * Parse coverage response to extract meaningful data
     */
    private parseCoverageResponse(response: any, type: string): any {
        const result: any = {
            coverageType: type,
            rawResponse: response,
        };

        if (type === 'INTENT') {
            const intentCoverage = response.intentCoverage;
            if (intentCoverage) {
                const covered = intentCoverage.coverageScore || 0;
                const intents = intentCoverage.intents || [];

                result.coverageScore = covered;
                result.totalIntents = intents.length;
                result.coveredIntents = intents.filter((i: any) => i.covered).length;
                result.uncoveredIntents = intents.filter((i: any) => !i.covered).length;
                result.coveragePercent = intents.length > 0
                    ? ((result.coveredIntents / intents.length) * 100).toFixed(2)
                    : 0;
                result.intents = intents.map((intent: any) => ({
                    name: intent.intent?.name || '',
                    displayName: intent.intent?.displayName || '',
                    covered: intent.covered || false,
                }));
                result.uncoveredIntentsList = result.intents
                    .filter((i: any) => !i.covered)
                    .map((i: any) => i.displayName);
            }
        } else if (type === 'PAGE_TRANSITION') {
            const transitionCoverage = response.transitionRouteGroupCoverage;
            if (transitionCoverage) {
                const covered = transitionCoverage.coverageScore || 0;
                const transitions = transitionCoverage.transitions || [];

                result.coverageScore = covered;
                result.totalTransitions = transitions.length;
                result.coveredTransitions = transitions.filter((t: any) => t.covered).length;
                result.uncoveredTransitions = transitions.filter((t: any) => !t.covered).length;
                result.coveragePercent = transitions.length > 0
                    ? ((result.coveredTransitions / transitions.length) * 100).toFixed(2)
                    : 0;
                result.transitions = transitions.map((transition: any) => ({
                    source: transition.transitionRoute?.name || '',
                    target: transition.transitionRoute?.targetPage || transition.transitionRoute?.targetFlow || '',
                    covered: transition.covered || false,
                }));
            }
        } else if (type === 'TRANSITION_ROUTE_GROUP') {
            const routeGroupCoverage = response.routeGroupCoverage;
            if (routeGroupCoverage) {
                const covered = routeGroupCoverage.coverageScore || 0;
                const routeGroups = routeGroupCoverage.coverages || [];

                result.coverageScore = covered;
                result.totalRouteGroups = routeGroups.length;
                result.coveredRouteGroups = routeGroups.filter((rg: any) => rg.covered).length;
                result.uncoveredRouteGroups = routeGroups.filter((rg: any) => !rg.covered).length;
                result.coveragePercent = routeGroups.length > 0
                    ? ((result.coveredRouteGroups / routeGroups.length) * 100).toFixed(2)
                    : 0;
                result.routeGroups = routeGroups.map((rg: any) => ({
                    name: rg.routeGroup?.name || '',
                    displayName: rg.routeGroup?.displayName || '',
                    covered: rg.covered || false,
                }));
            }
        }

        return result;
    }

    /**
     * Parse CSV to conversation test cases
     */
    parseCSVToTestCases(
        rows: Array<{
            test_name: string;
            turn_number: string;
            user_input: string;
            expected_intent?: string;
            expected_page?: string;
            expected_response?: string;
            expected_params?: string;
            session_params?: string;
            start_flow?: string;
            start_page?: string;
            tags?: string;
            notes?: string;
        }>
    ): TestCaseData[] {
        const testCaseMap = new Map<string, TestCaseData>();

        for (const row of rows) {
            const testName = row.test_name;
            if (!testName) continue;

            if (!testCaseMap.has(testName)) {
                testCaseMap.set(testName, {
                    displayName: testName,
                    tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
                    notes: row.notes,
                    testConfig: row.start_flow || row.start_page
                        ? {
                            flow: row.start_flow,
                            page: row.start_page,
                        }
                        : undefined,
                    testCaseConversationTurns: [],
                });
            }

            const testCase = testCaseMap.get(testName)!;

            // Build conversation turn
            const turn: ConversationTurn = {
                userInput: {
                    input: {
                        text: { text: row.user_input },
                    },
                    injectedParameters: row.session_params
                        ? JSON.parse(row.session_params)
                        : undefined,
                    isWebhookEnabled: true,
                },
                virtualAgentOutput: {
                    triggeredIntent: row.expected_intent
                        ? { name: '', displayName: row.expected_intent }
                        : undefined,
                    currentPage: row.expected_page
                        ? { name: '', displayName: row.expected_page }
                        : undefined,
                    textResponses: row.expected_response
                        ? [{ text: [row.expected_response] }]
                        : undefined,
                    sessionParameters: row.expected_params
                        ? JSON.parse(row.expected_params)
                        : undefined,
                },
            };

            testCase.testCaseConversationTurns.push(turn);
        }

        return Array.from(testCaseMap.values());
    }
}

export const conversationTestService = new ConversationTestService();
