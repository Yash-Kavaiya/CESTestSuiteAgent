import { useEffect, useState } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    FileSpreadsheet,
    ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DonutChart from '../components/charts/DonutChart';
import LineChart from '../components/charts/LineChart';
import { useResultStore } from '../store/useResultStore';
import { useAgentStore } from '../store/useAgentStore';
import { TestRun } from '../types';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Dashboard() {
    const { selectedAgent } = useAgentStore();
    const { dashboardMetrics, setDashboardMetrics } = useResultStore();
    const [isLoading, setIsLoading] = useState(false);

    // Initialize with zero values
    useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
            setDashboardMetrics({
                totalTestCases: 0,
                totalRuns: 0,
                lastRunPassRate: 0,
                overallPassRate: 0,
                avgExecutionTime: 0,
                coverage: {
                    totalIntents: 0,
                    testedIntents: 0,
                    intentCoveragePercent: 0,
                    totalPages: 0,
                    testedPages: 0,
                    pageCoveragePercent: 0,
                    untestedIntents: [],
                    untestedPages: [],
                },
                recentRuns: [],
                trends: [],
            });
            setIsLoading(false);
        }, 500);
    }, [selectedAgent, setDashboardMetrics]);

    const metrics = dashboardMetrics;

    const statCards = [
        {
            title: 'Total Test Cases',
            value: metrics?.totalTestCases ?? 0,
            icon: FileSpreadsheet,
            color: 'primary',
            bgColor: 'bg-primary-500/10',
            iconColor: 'text-primary-400',
        },
        {
            title: 'Pass Rate',
            value: `${metrics?.lastRunPassRate?.toFixed(1) ?? 0}%`,
            icon: CheckCircle,
            color: 'success',
            bgColor: 'bg-success-500/10',
            iconColor: 'text-success-500',
        },
        {
            title: 'Failed Tests',
            value: metrics?.recentRuns?.[0]?.failedTests ?? 0,
            icon: XCircle,
            color: 'danger',
            bgColor: 'bg-danger-500/10',
            iconColor: 'text-danger-500',
        },
        {
            title: 'Avg. Execution Time',
            value: `${metrics?.avgExecutionTime?.toFixed(1) ?? 0}s`,
            icon: Clock,
            color: 'warning',
            bgColor: 'bg-warning-500/10',
            iconColor: 'text-warning-500',
        },
    ];

    const passFailData = [
        { name: 'Passed', value: metrics?.recentRuns?.[0]?.passedTests ?? 0, color: '#22c55e' },
        { name: 'Failed', value: metrics?.recentRuns?.[0]?.failedTests ?? 0, color: '#ef4444' },
    ];

    const trendsData = metrics?.trends ?? [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary-700">Dashboard</h1>
                    <p className="text-dark-400 mt-1">
                        {selectedAgent
                            ? `Testing ${selectedAgent.displayName}`
                            : 'Configure an agent to start testing'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to="/bulk-test">
                        <Button leftIcon={<Zap className="w-4 h-4" />}>Run Batch</Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <Card key={stat.title} className="p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-dark-400">{stat.title}</p>
                                <p className="text-2xl font-bold text-dark-50 mt-1">{stat.value}</p>
                            </div>
                            <div className={clsx('p-3 rounded-xl', stat.bgColor)}>
                                <stat.icon className={clsx('w-5 h-5', stat.iconColor)} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pass/Fail Chart */}
                <Card>
                    <CardHeader
                        title="Test Results"
                        subtitle="Latest run distribution"
                    />
                    <CardContent>
                        <DonutChart
                            data={passFailData}
                            centerValue={`${metrics?.lastRunPassRate?.toFixed(0) ?? 0}%`}
                            centerLabel="Pass Rate"
                        />
                    </CardContent>
                </Card>

                {/* Trends Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Weekly Trends"
                        subtitle="Test execution over time"
                        action={
                            <Button variant="ghost" size="sm" rightIcon={<TrendingUp className="w-4 h-4" />}>
                                View Details
                            </Button>
                        }
                    />
                    <CardContent>
                        <LineChart
                            data={trendsData}
                            xAxisKey="date"
                            lines={[
                                { dataKey: 'passedTests', name: 'Passed', color: '#22c55e' },
                                { dataKey: 'failedTests', name: 'Failed', color: '#ef4444' },
                            ]}
                            height={250}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Coverage & Recent Runs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coverage Metrics */}
                <Card>
                    <CardHeader
                        title="Coverage Overview"
                        subtitle="Intent and page test coverage"
                        action={
                            <Link to="/coverage">
                                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                    Full Report
                                </Button>
                            </Link>
                        }
                    />
                    <CardContent className="space-y-4">
                        {/* Intent Coverage */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-dark-400">Intent Coverage</span>
                                <span className="text-dark-200 font-medium">
                                    {metrics?.coverage?.testedIntents ?? 0}/{metrics?.coverage?.totalIntents ?? 0}
                                </span>
                            </div>
                            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${metrics?.coverage?.intentCoveragePercent ?? 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Page Coverage */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-dark-400">Page Coverage</span>
                                <span className="text-dark-200 font-medium">
                                    {metrics?.coverage?.testedPages ?? 0}/{metrics?.coverage?.totalPages ?? 0}
                                </span>
                            </div>
                            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${metrics?.coverage?.pageCoveragePercent ?? 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Untested Items */}
                        {metrics?.coverage?.untestedIntents && metrics.coverage.untestedIntents.length > 0 && (
                            <div className="pt-3 border-t border-dark-700">
                                <p className="text-xs text-dark-500 mb-2">Untested Intents</p>
                                <div className="flex flex-wrap gap-2">
                                    {metrics.coverage.untestedIntents.slice(0, 3).map((intent) => (
                                        <span
                                            key={intent}
                                            className="px-2 py-1 text-xs bg-dark-700 text-dark-300 rounded-md"
                                        >
                                            {intent}
                                        </span>
                                    ))}
                                    {metrics.coverage.untestedIntents.length > 3 && (
                                        <span className="px-2 py-1 text-xs text-dark-500">
                                            +{metrics.coverage.untestedIntents.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Runs */}
                <Card>
                    <CardHeader
                        title="Recent Test Runs"
                        subtitle="Latest batch executions"
                        action={
                            <Link to="/history">
                                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                    View All
                                </Button>
                            </Link>
                        }
                    />
                    <CardContent>
                        <div className="space-y-3">
                            {metrics?.recentRuns?.map((run: TestRun) => (
                                <div
                                    key={run.id}
                                    className="flex items-center gap-4 p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer"
                                >
                                    <div
                                        className={clsx(
                                            'w-10 h-10 rounded-lg flex items-center justify-center',
                                            run.status === 'completed' && run.passedTests === run.totalTests
                                                ? 'bg-success-500/20'
                                                : run.status === 'failed' || run.failedTests > run.totalTests * 0.3
                                                    ? 'bg-danger-500/20'
                                                    : 'bg-warning-500/20'
                                        )}
                                    >
                                        {run.status === 'completed' && run.passedTests === run.totalTests ? (
                                            <CheckCircle className="w-5 h-5 text-success-500" />
                                        ) : run.status === 'failed' || run.failedTests > run.totalTests * 0.3 ? (
                                            <XCircle className="w-5 h-5 text-danger-500" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 text-warning-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-dark-200 truncate">
                                            {run.name}
                                        </p>
                                        <p className="text-xs text-dark-500">
                                            {run.completedAt
                                                ? format(new Date(run.completedAt), 'MMM d, h:mm a')
                                                : 'In progress'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-dark-200">
                                            {run.passedTests}/{run.totalTests}
                                        </p>
                                        <p className="text-xs text-dark-500">passed</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
