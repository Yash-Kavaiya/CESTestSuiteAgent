import { useState, useMemo, useEffect } from 'react';
import {
    Search,
    Download,
    ChevronDown,
    ChevronRight,
    X,
    MessageSquare,
    GitBranch,
    Target,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useResultStore } from '../store/useResultStore';
import { TestResult, DiffType } from '../types';
import clsx from 'clsx';
import { runsApi } from '../api/runs';
import { useSearchParams } from 'react-router-dom';

// Diff type icons and colors
const diffTypeConfig: Record<DiffType, { icon: typeof Target; color: string; label: string }> = {
    DIFF_TYPE_UNSPECIFIED: { icon: AlertCircle, color: 'text-dark-400', label: 'Unknown' },
    INTENT: { icon: Target, color: 'text-red-400', label: 'Intent Mismatch' },
    PAGE: { icon: GitBranch, color: 'text-orange-400', label: 'Page Mismatch' },
    PARAMETERS: { icon: FileText, color: 'text-yellow-400', label: 'Parameters Diff' },
    UTTERANCE: { icon: MessageSquare, color: 'text-purple-400', label: 'Response Diff' },
    FLOW: { icon: GitBranch, color: 'text-blue-400', label: 'Flow Mismatch' },
};

export default function Results() {
    const { statusFilter, setStatusFilter, searchQuery, setSearchQuery, clearFilters } = useResultStore();
    const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
    const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');

    useEffect(() => {
        if (runId) {
            loadResults(runId);
        } else {
            loadLatestRun();
        }
    }, [runId]);

    const loadLatestRun = async () => {
        try {
            setLoading(true);
            const response = await runsApi.list();
            if (response.success && response.data && response.data.length > 0) {
                // Assuming sorted by backend
                loadResults(response.data[0].id);
            } else {
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const loadResults = async (id: string) => {
        try {
            setLoading(true);
            const response = await runsApi.getResults(id);
            if (response.success && response.data?.results) {
                setResults(response.data.results);
            }
        } catch (error) {
            console.error('Failed to load results', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredResults = useMemo(() => {
        return results.filter((result) => {
            if (statusFilter !== 'all') {
                const status = statusFilter === 'passed' ? 'PASSED' : 'FAILED';
                if (result.status !== status) return false;
            }
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    result.testCaseName.toLowerCase().includes(query) ||
                    result.conversationTurns.some(
                        (t) =>
                            t.userInput.toLowerCase().includes(query) ||
                            (t.expectedIntent && t.expectedIntent.toLowerCase().includes(query))
                    )
                );
            }
            return true;
        });
    }, [statusFilter, searchQuery, results]);

    const toggleTurn = (turnNumber: number) => {
        setExpandedTurns((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(turnNumber)) {
                newSet.delete(turnNumber);
            } else {
                newSet.add(turnNumber);
            }
            return newSet;
        });
    };

    const columns: ColumnDef<TestResult>[] = [
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const passed = row.original.overallPassed;
                return (
                    <div
                        className={clsx(
                            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                            passed ? 'bg-success-500/20 text-success-500' : 'bg-danger-500/20 text-danger-500'
                        )}
                    >
                        {passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {passed ? 'Passed' : 'Failed'}
                    </div>
                );
            },
        },
        {
            accessorKey: 'testCaseName',
            header: 'Test Case',
            cell: ({ row }) => (
                <span className="font-medium text-dark-200">{row.original.testCaseName}</span>
            ),
        },
        {
            id: 'turns',
            header: 'Turns',
            cell: ({ row }) => (
                <span className="text-dark-400">{row.original.conversationTurns.length} turns</span>
            ),
        },
        {
            id: 'differences',
            header: 'Differences',
            cell: ({ row }) => {
                const allDiffs = row.original.conversationTurns.flatMap((t) => t.differences);
                if (allDiffs.length === 0) return <span className="text-dark-500">None</span>;

                const diffCounts: Record<string, number> = {};
                allDiffs.forEach((d) => {
                    diffCounts[d.type] = (diffCounts[d.type] || 0) + 1;
                });

                return (
                    <div className="flex gap-1">
                        {Object.entries(diffCounts).map(([type, count]) => {
                            const config = diffTypeConfig[type as DiffType];
                            return (
                                <span
                                    key={type}
                                    className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs', config.color)}
                                    title={config.label}
                                >
                                    <config.icon className="w-3 h-3" />
                                    {count}
                                </span>
                            );
                        })}
                    </div>
                );
            },
        },
        {
            accessorKey: 'executionTimeMs',
            header: 'Time',
            cell: ({ row }) => `${row.original.executionTimeMs}ms`,
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <button
                    onClick={() => setSelectedResult(row.original)}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-dark-50 hover:bg-dark-700 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            ),
        },
    ];

    const statusCounts = {
        all: results.length,
        passed: results.filter((r) => r.overallPassed).length,
        failed: results.filter((r) => !r.overallPassed).length,
    };

    const handleExport = () => {
        if (results.length === 0) return;

        // Define CSV headers
        const headers = ['Test Case ID', 'Test Case Name', 'Status', 'Passed', 'Execution Time (ms)', 'Turns Count'];

        // Map results to CSV rows
        const rows = results.map(result => [
            result.testCaseId,
            `"${result.testCaseName.replace(/"/g, '""')}"`, // Escape quotes
            result.status,
            result.overallPassed ? 'TRUE' : 'FALSE',
            result.executionTimeMs,
            result.conversationTurns.length
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `test_results_${runId || 'latest'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary-700">Conversation Test Results</h1>
                    <p className="text-dark-400 mt-1">
                        View and analyze multi-turn conversation test results with detailed diffs
                    </p>
                </div>
                <Button variant="secondary" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
                    Export Results
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                            type="text"
                            placeholder="Search by test name, input, or intent..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {(['all', 'passed', 'failed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                    statusFilter === status
                                        ? 'bg-primary-600 text-dark-50'
                                        : 'bg-dark-700 text-dark-400 hover:text-dark-50'
                                )}
                            >
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} (
                                {statusCounts[status]})
                            </button>
                        ))}
                    </div>

                    {(statusFilter !== 'all' || searchQuery) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-sm text-dark-400 hover:text-dark-50"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                </div>
            </Card>

            {/* Results Table */}
            <Card className="p-0 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-dark-400">Loading results...</div>
                ) : (
                    <Table
                        data={filteredResults}
                        columns={columns}
                        onRowClick={setSelectedResult}
                        emptyMessage="No conversation test results found"
                    />
                )}
            </Card>

            {/* Result Detail Modal */}
            <Modal
                isOpen={!!selectedResult}
                onClose={() => {
                    setSelectedResult(null);
                    setExpandedTurns(new Set());
                }}
                title="Conversation Test Details"
                size="lg"
            >
                {selectedResult && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-dark-50">{selectedResult.testCaseName}</h3>
                                <p className="text-sm text-dark-400 mt-1">
                                    {selectedResult.conversationTurns.length} conversation turns •{' '}
                                    {selectedResult.executionTimeMs}ms
                                </p>
                            </div>
                            <div
                                className={clsx(
                                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                                    selectedResult.overallPassed
                                        ? 'bg-success-500/20 text-success-500'
                                        : 'bg-danger-500/20 text-danger-500'
                                )}
                            >
                                {selectedResult.overallPassed ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                {selectedResult.overallPassed ? 'PASSED' : 'FAILED'}
                            </div>
                        </div>

                        {/* Conversation Timeline */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-dark-300">Conversation Timeline</h4>
                            {selectedResult.conversationTurns.map((turn) => (
                                <div
                                    key={turn.turnNumber}
                                    className={clsx(
                                        'border rounded-lg overflow-hidden transition-colors',
                                        turn.passed
                                            ? 'border-dark-600 bg-dark-700/30'
                                            : 'border-danger-500/30 bg-danger-500/5'
                                    )}
                                >
                                    {/* Turn Header */}
                                    <button
                                        onClick={() => toggleTurn(turn.turnNumber)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-dark-700/50 transition-colors"
                                    >
                                        <div
                                            className={clsx(
                                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                                                turn.passed ? 'bg-success-500/20 text-success-500' : 'bg-danger-500/20 text-danger-500'
                                            )}
                                        >
                                            {turn.turnNumber}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm text-dark-200 truncate">"{turn.userInput}"</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {turn.expectedIntent && (
                                                    <span className="text-xs text-dark-500">
                                                        Intent: <span className="text-dark-400">{turn.expectedIntent}</span>
                                                    </span>
                                                )}
                                                {turn.differences.length > 0 && (
                                                    <span className="text-xs text-danger-400">
                                                        {turn.differences.length} diff{turn.differences.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={clsx(
                                                'w-4 h-4 text-dark-400 transition-transform',
                                                expandedTurns.has(turn.turnNumber) && 'rotate-180'
                                            )}
                                        />
                                    </button>

                                    {/* Turn Details */}
                                    {expandedTurns.has(turn.turnNumber) && (
                                        <div className="border-t border-dark-600 p-4 space-y-4">
                                            {/* Intent Comparison */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-dark-500 mb-1">Expected Intent</p>
                                                    <p className="text-sm text-dark-300 font-mono">
                                                        {turn.expectedIntent || '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-dark-500 mb-1">Actual Intent</p>
                                                    <p
                                                        className={clsx(
                                                            'text-sm font-mono',
                                                            turn.expectedIntent === turn.actualIntent
                                                                ? 'text-success-400'
                                                                : 'text-danger-400'
                                                        )}
                                                    >
                                                        {turn.actualIntent || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Page Comparison */}
                                            {(turn.expectedPage || turn.actualPage) && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-dark-500 mb-1">Expected Page</p>
                                                        <p className="text-sm text-dark-300">{turn.expectedPage || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-dark-500 mb-1">Actual Page</p>
                                                        <p
                                                            className={clsx(
                                                                'text-sm',
                                                                turn.expectedPage === turn.actualPage
                                                                    ? 'text-success-400'
                                                                    : 'text-danger-400'
                                                            )}
                                                        >
                                                            {turn.actualPage || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response Comparison */}
                                            {(turn.expectedResponse || turn.actualResponse) && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-dark-500 mb-1">Expected Response</p>
                                                        <p className="text-sm text-dark-300 bg-dark-700 p-2 rounded">
                                                            {turn.expectedResponse || '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-dark-500 mb-1">Actual Response</p>
                                                        <p className="text-sm text-dark-300 bg-dark-700 p-2 rounded">
                                                            {turn.actualResponse || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Differences */}
                                            {turn.differences.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-dark-500 mb-2">Differences Detected</p>
                                                    <div className="space-y-2">
                                                        {turn.differences.map((diff, diffIndex) => {
                                                            const config = diffTypeConfig[diff.type];
                                                            return (
                                                                <div
                                                                    key={diffIndex}
                                                                    className="flex items-start gap-2 p-2 bg-danger-500/10 border border-danger-500/20 rounded"
                                                                >
                                                                    <config.icon className={clsx('w-4 h-4 mt-0.5', config.color)} />
                                                                    <div>
                                                                        <p className={clsx('text-xs font-medium', config.color)}>
                                                                            {config.label}
                                                                        </p>
                                                                        <p className="text-xs text-dark-400 mt-0.5">{diff.description}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
