import { create } from 'zustand';
import { TestResult, TestRun, DashboardMetrics } from '../types';

interface ResultState {
    results: TestResult[];
    runs: TestRun[];
    dashboardMetrics: DashboardMetrics | null;
    selectedResult: TestResult | null;
    isLoading: boolean;
    error: string | null;

    // Filters
    statusFilter: 'all' | 'passed' | 'failed' | 'error';
    dateFilter: { start: Date | null; end: Date | null };
    searchQuery: string;

    // Actions
    setResults: (results: TestResult[]) => void;
    addResults: (results: TestResult[]) => void;
    setRuns: (runs: TestRun[]) => void;
    addRun: (run: TestRun) => void;
    updateRun: (runId: string, updates: Partial<TestRun>) => void;
    setDashboardMetrics: (metrics: DashboardMetrics) => void;
    setSelectedResult: (result: TestResult | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setStatusFilter: (status: 'all' | 'passed' | 'failed' | 'error') => void;
    setDateFilter: (filter: { start: Date | null; end: Date | null }) => void;
    setSearchQuery: (query: string) => void;
    clearFilters: () => void;
}

export const useResultStore = create<ResultState>((set) => ({
    results: [],
    runs: [],
    dashboardMetrics: null,
    selectedResult: null,
    isLoading: false,
    error: null,
    statusFilter: 'all',
    dateFilter: { start: null, end: null },
    searchQuery: '',

    setResults: (results) => set({ results }),

    addResults: (newResults) =>
        set((state) => ({
            results: [...state.results, ...newResults],
        })),

    setRuns: (runs) => set({ runs }),

    addRun: (run) =>
        set((state) => ({
            runs: [run, ...state.runs],
        })),

    updateRun: (runId, updates) =>
        set((state) => ({
            runs: state.runs.map((run) =>
                run.id === runId ? { ...run, ...updates } : run
            ),
        })),

    setDashboardMetrics: (dashboardMetrics) => set({ dashboardMetrics }),

    setSelectedResult: (selectedResult) => set({ selectedResult }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setStatusFilter: (statusFilter) => set({ statusFilter }),

    setDateFilter: (dateFilter) => set({ dateFilter }),

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    clearFilters: () =>
        set({
            statusFilter: 'all',
            dateFilter: { start: null, end: null },
            searchQuery: '',
        }),
}));
