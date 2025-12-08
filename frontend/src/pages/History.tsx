import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    ChevronRight,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import { TestRun } from '../types';
import clsx from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { runsApi } from '../api/runs';

// Mock data removed


const History = () => {
    const [runs, setRuns] = useState<TestRun[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRuns();
    }, []);

    const loadRuns = async () => {
        try {
            setLoading(true);
            const response = await runsApi.list();
            if (response.success && response.data) {
                setRuns(response.data);
            }
        } catch (error) {
            console.error('Failed to load runs', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRuns = useMemo(() => {
        return statusFilter === 'all'
            ? runs
            : runs.filter((run) => run.status === statusFilter);
    }, [runs, statusFilter]);

    const getPassRate = (run: TestRun) =>
        ((run.passedTests / run.totalTests) * 100).toFixed(1);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary-700">Test History</h1>
                    <p className="text-dark-400 mt-1">
                        View past test runs and performance trends
                    </p>
                </div>
            </div>

            {/* Trend Chart - Only show if we have runs */}
            {runs.length > 0 && (
                <Card>
                    <CardHeader
                        title="Pass Rate Trend"
                        subtitle="Daily test pass rate over time"
                    />
                    <CardContent>
                        {/* Placeholder for real trend data calculation or use simple mapping */}
                        <div className="text-center text-dark-400 py-8">
                            Trend chart requires enough history data.
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Runs List */}
            <Card>
                <CardHeader
                    title="Test Runs"
                    subtitle="All executed test batches"
                    action={
                        <div className="flex items-center gap-2">
                            {(['all', 'completed', 'failed'] as const).map((status) => (
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
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    }
                />
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-dark-400">Loading runs...</div>
                    ) : filteredRuns.length === 0 ? (
                        <div className="text-center py-8 text-dark-400">No runs found.</div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRuns.map((run) => (
                                <div
                                    key={run.id}
                                    className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer group"
                                >
                                    {/* Status Icon */}
                                    <div
                                        className={clsx(
                                            'w-12 h-12 rounded-xl flex items-center justify-center',
                                            run.failedTests === 0
                                                ? 'bg-success-500/20'
                                                : run.failedTests > run.totalTests * 0.2
                                                    ? 'bg-danger-500/20'
                                                    : 'bg-warning-500/20'
                                        )}
                                    >
                                        {run.failedTests === 0 ? (
                                            <CheckCircle className="w-6 h-6 text-success-500" />
                                        ) : run.failedTests > run.totalTests * 0.2 ? (
                                            <XCircle className="w-6 h-6 text-danger-500" />
                                        ) : (
                                            <CheckCircle className="w-6 h-6 text-warning-500" />
                                        )}
                                    </div>

                                    {/* Run Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-dark-100 truncate">
                                            {run.name || 'Untitled Run'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-sm text-dark-400 flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {run.completedAt
                                                    ? format(new Date(run.completedAt), 'MMM d, h:mm a')
                                                    : format(new Date(run.startedAt!), 'MMM d, h:mm a')}
                                            </span>
                                            <span className="text-sm text-dark-400 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {run.completedAt
                                                    ? formatDistanceToNow(new Date(run.completedAt), {
                                                        addSuffix: true,
                                                    })
                                                    : 'In progress'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm text-dark-500">Pass Rate</p>
                                            <p
                                                className={clsx(
                                                    'text-lg font-semibold',
                                                    parseFloat(getPassRate(run)) >= 90
                                                        ? 'text-success-500'
                                                        : parseFloat(getPassRate(run)) >= 70
                                                            ? 'text-warning-500'
                                                            : 'text-danger-500'
                                                )}
                                            >
                                                {getPassRate(run)}%
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-dark-500">Tests</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-success-500 font-medium">
                                                    {run.passedTests}
                                                </span>
                                                <span className="text-dark-600">/</span>
                                                <span className="text-danger-500 font-medium">
                                                    {run.failedTests}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-dark-300 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default History;
