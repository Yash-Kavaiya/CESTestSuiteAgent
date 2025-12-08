// ============================================
// Dialogflow CX Test Cases API Types
// Based on: https://cloud.google.com/dialogflow/cx/docs/reference/rpc/google.cloud.dialogflow.cx.v3
// ============================================

// Test Run Difference Types
export type DiffType = 'DIFF_TYPE_UNSPECIFIED' | 'INTENT' | 'PAGE' | 'PARAMETERS' | 'UTTERANCE' | 'FLOW';

export interface TestRunDifference {
    type: DiffType;
    description: string;
}

// Conversation Turn Types
export interface UserInput {
    input: {
        text?: { text: string };
        dtmf?: { digits: string; finishDigit: string };
        event?: { event: string };
    };
    injectedParameters?: Record<string, unknown>;
    isWebhookEnabled?: boolean;
    enableSentimentAnalysis?: boolean;
}

export interface VirtualAgentOutput {
    sessionParameters?: Record<string, unknown>;
    differences?: TestRunDifference[];
    diagnosticInfo?: Record<string, unknown>;
    triggeredIntent?: {
        name: string;
        displayName: string;
    };
    currentPage?: {
        name: string;
        displayName: string;
    };
    textResponses?: Array<{ text: string[] }>;
    status?: {
        code: number;
        message: string;
    };
}

export interface ConversationTurn {
    userInput?: UserInput;
    virtualAgentOutput?: VirtualAgentOutput;
}

// Test Configuration
export interface TestConfig {
    trackingParameters?: string[];
    flow?: string;  // Format: projects/<ProjectID>/locations/<LocationID>/agents/<AgentID>/flows/<FlowID>
    page?: string;  // Format: projects/<ProjectID>/locations/<LocationID>/agents/<AgentID>/flows/<FlowID>/pages/<PageID>
}

// Test Result Type
export type TestResultStatus = 'TEST_RESULT_UNSPECIFIED' | 'PASSED' | 'FAILED';

// Dialogflow CX Test Case
export interface DialogflowTestCase {
    name?: string;  // Format: projects/<ProjectID>/locations/<LocationID>/agents/<AgentID>/testCases/<TestCaseID>
    tags?: string[];
    displayName: string;
    notes?: string;
    testConfig?: TestConfig;
    testCaseConversationTurns?: ConversationTurn[];
    creationTime?: string;
    lastTestResult?: DialogflowTestCaseResult;
}

// Dialogflow CX Test Case Result
export interface DialogflowTestCaseResult {
    name?: string;
    environment?: string;
    conversationTurns?: ConversationTurn[];
    testResult?: TestResultStatus;
    testTime?: string;
}

// ============================================
// Application-specific Types (Extended)
// ============================================

// Simplified Test Case for UI
export interface TestCase {
    id: string;
    conversationId: string;
    displayName: string;
    notes?: string;
    tags?: string[];
    testConfig?: TestConfig;
    conversationTurns: ConversationTurn[];
    createdAt: string;
    updatedAt: string;
    lastResult?: TestResultStatus;
    dialogflowName?: string;  // Dialogflow resource name when synced
}

export interface TestConversation {
    conversationId: string;
    displayName: string;
    turns: ConversationTurn[];
    tags?: string[];
    testConfig?: TestConfig;
}

// Test Run Types
export interface TestRun {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    environment?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
}

export interface TestResult {
    id: string;
    runId: string;
    testCaseId: string;
    testCaseName: string;
    status: TestResultStatus;
    conversationTurns: Array<{
        turnNumber: number;
        userInput: string;
        expectedIntent?: string;
        actualIntent?: string;
        expectedPage?: string;
        actualPage?: string;
        expectedResponse?: string;
        actualResponse?: string;
        differences: TestRunDifference[];
        passed: boolean;
    }>;
    overallPassed: boolean;
    executionTimeMs: number;
    errorMessage?: string;
    createdAt: string;
}

// Agent Types
export interface Agent {
    id: string;
    displayName: string;
    projectId: string;
    location: string;
    defaultLanguageCode: string;
    resourceName?: string;  // Full resource path
}

export interface Intent {
    name: string;
    displayName: string;
    trainingPhrases?: string[];
}

export interface Page {
    name: string;
    displayName: string;
}

export interface Flow {
    name: string;
    displayName: string;
}

// Analytics Types
export interface CoverageMetrics {
    totalIntents: number;
    testedIntents: number;
    intentCoveragePercent: number;
    totalPages: number;
    testedPages: number;
    pageCoveragePercent: number;
    totalTransitions: number;
    testedTransitions: number;
    transitionCoveragePercent: number;
    untestedIntents: string[];
    untestedPages: string[];
}

export interface TestTrend {
    date: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
}

export interface DashboardMetrics {
    totalTestCases: number;
    totalRuns: number;
    lastRunPassRate: number;
    overallPassRate: number;
    avgExecutionTime: number;
    coverage: CoverageMetrics;
    recentRuns: TestRun[];
    trends: TestTrend[];
}

// CSV Types for Conversation Testing
export interface ConversationCSVRow {
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
}

export interface CSVParseResult {
    success: boolean;
    conversations: TestConversation[];
    errors: CSVParseError[];
    warnings: string[];
    totalRows: number;
    validRows: number;
}

export interface CSVParseError {
    row: number;
    column?: string;
    message: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Batch Run Types
export interface BatchRunTestCasesRequest {
    parent: string;  // Agent name
    testCases: string[];  // Test case resource names
    environment?: string;
}

export interface BatchRunTestCasesResponse {
    results: DialogflowTestCaseResult[];
}

