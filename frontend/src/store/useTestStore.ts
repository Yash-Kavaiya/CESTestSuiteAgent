import { create } from 'zustand';
import { TestCase, TestRun, TestResult, TestConversation } from '../types';

interface TestState {
    // Single test
    currentTest: Partial<TestCase> | null;
    singleTestResult: TestResult | null;
    isExecutingSingle: boolean;

    // Bulk test
    uploadedConversations: TestConversation[];
    currentRun: TestRun | null;
    runProgress: number;
    isExecutingBatch: boolean;

    // Actions
    setCurrentTest: (test: Partial<TestCase> | null) => void;
    setSingleTestResult: (result: TestResult | null) => void;
    setIsExecutingSingle: (executing: boolean) => void;
    setUploadedConversations: (conversations: TestConversation[]) => void;
    setCurrentRun: (run: TestRun | null) => void;
    setRunProgress: (progress: number) => void;
    setIsExecutingBatch: (executing: boolean) => void;
    resetSingleTest: () => void;
    resetBulkTest: () => void;
}

export const useTestStore = create<TestState>((set) => ({
    // Single test
    currentTest: null,
    singleTestResult: null,
    isExecutingSingle: false,

    // Bulk test
    uploadedConversations: [],
    currentRun: null,
    runProgress: 0,
    isExecutingBatch: false,

    // Actions
    setCurrentTest: (currentTest) => set({ currentTest }),

    setSingleTestResult: (singleTestResult) => set({ singleTestResult }),

    setIsExecutingSingle: (isExecutingSingle) => set({ isExecutingSingle }),

    setUploadedConversations: (uploadedConversations) =>
        set({ uploadedConversations }),

    setCurrentRun: (currentRun) => set({ currentRun }),

    setRunProgress: (runProgress) => set({ runProgress }),

    setIsExecutingBatch: (isExecutingBatch) => set({ isExecutingBatch }),

    resetSingleTest: () =>
        set({
            currentTest: null,
            singleTestResult: null,
            isExecutingSingle: false,
        }),

    resetBulkTest: () =>
        set({
            uploadedConversations: [],
            currentRun: null,
            runProgress: 0,
            isExecutingBatch: false,
        }),
}));
