import { useEffect, useState, useCallback } from 'react';
import {
    CheckCircle,
    Zap,
    FileSpreadsheet,
    ArrowRight,
    AlertTriangle,
    MessageSquare,
    Target,
    Loader2,
    Users,
    Activity,
    Timer,
    Repeat,
    Server,
    RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DonutChart from '../components/charts/DonutChart';
import { useAgentStore } from '../store/useAgentStore';
import clsx from 'clsx';
import { format } from 'date-fns';
import { dashboardApi, DashboardMetrics } from '../api/dashboard';
import { extractErrorMessage } from '../utils/errors';

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
}

export default function Dashboard() {
    const { selectedAgent } = useAgentStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

    const loadMetrics = useCallback(async () => {
        if (!selectedAgent) {
            setMetrics(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await dashboardApi.getDashboardMetrics(selectedAgent);
            if (response.success && response.data) {
                setMetrics(response.data);
            } else {
                setError(response.error || 'Unable to load analytics data. Please try again.');
            }
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [selectedAgent]);

    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);

    // Primary stat cards (top row)
    const primaryStats = [
        {
            title: 'Total Conversations',
            value: metrics?.totalConversations ?? 0,
            icon: MessageSquare,
            bgColor: 'bg-primary-500/10',
            iconColor: 'text-primary-400',
        },
        {
            title: 'Total Interactions',
            value: metrics?.totalInteractions ?? 0,
            icon: FileSpreadsheet,
            bgColor: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
        },
        {
            title: 'Avg Match Confidence',
            value: `${((metrics?.avgMatchConfidence ?? 0) * 100).toFixed(1)}%`,
            icon: Target,
            bgColor: 'bg-success-500/10',
            iconColor: 'text-success-500',
        },
        {
            title: 'No-Match Rate',
            value: metrics?.matchTypeCounts
                ? `${(
                    (metrics.matchTypeCounts.noMatchCount /
                        Math.max(1, metrics.matchTypeCounts.intentCount + metrics.matchTypeCounts.noMatchCount + metrics.matchTypeCounts.noInputCount)) *
                    100
                ).toFixed(1)}%`
                : '0%',
            icon: AlertTriangle,
            bgColor: 'bg-warning-500/10',
            iconColor: 'text-warning-500',
        },
    ];

    // Secondary stat cards (new KPIs)
    const secondaryStats = [
        {
            title: 'Completion Rate',
            value: `${((metrics?.completionRate ?? 0) * 100).toFixed(1)}%`,
            icon: CheckCircle,
            bgColor: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400',
            description: 'Conversations reaching end interaction',
        },
        {
            title: 'Handoff Rate',
            value: `${((metrics?.handoffRate ?? 0) * 100).toFixed(1)}%`,
            icon: Users,
            bgColor: 'bg-purple-500/10',
            iconColor: 'text-purple-400',
            description: 'Conversations transferred to human',
        },
        {
            title: 'Avg Duration',
            value: formatDuration(metrics?.avgDurationSeconds ?? 0),
            icon: Timer,
            bgColor: 'bg-cyan-500/10',
            iconColor: 'text-cyan-400',
            description: 'Average conversation length',
        },
        {
            title: 'Avg Turns',
            value: (metrics?.avgTurnsPerConversation ?? 0).toFixed(1),
            icon: Repeat,
            bgColor: 'bg-indigo-500/10',
            iconColor: 'text-indigo-400',
            description: 'Average interactions per conversation',
        },
        {
            title: 'Max Webhook Latency',
            value: `${(metrics?.maxWebhookLatencyMs ?? 0).toFixed(0)}ms`,
            icon: Server,
            bgColor: 'bg-orange-500/10',
            iconColor: 'text-orange-400',
            description: 'Peak webhook response time',
        },
    ];

    const matchTypeData = metrics?.matchTypeCounts
        ? [
            { name: 'Intent Match', value: metrics.matchTypeCounts.intentCount, color: '#22c55e' },
            { name: 'Direct Intent', value: metrics.matchTypeCounts.directIntentCount, color: '#3b82f6' },
            { name: 'Parameter Filling', value: metrics.matchTypeCounts.parameterFillingCount, color: '#8b5cf6' },
            { name: 'No Match', value: metrics.matchTypeCounts.noMatchCount, color: '#ef4444' },
            { name: 'No Input', value: metrics.matchTypeCounts.noInputCount, color: '#f97316' },
            { name: 'Event', value: metrics.matchTypeCounts.eventCount, color: '#06b6d4' },
        ].filter((d) => d.value > 0)
        : [];

    const totalMatches = matchTypeData.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary-700">Dashboard</h1>
                    <p className="text-dark-400 mt-1">
                        {selectedAgent
                            ? `Conversation Analytics for ${selectedAgent.displayName}`
                            : 'Select an agent from the header to view analytics'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to="/bulk-test">
                        <Button leftIcon={<Zap className="w-4 h-4" />}>Run Batch</Button>
                    </Link>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <span className="ml-3 text-dark-400">Loading conversation analytics...</span>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Card className="p-6 border-danger-500/30 bg-danger-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-danger-400" />
                            <div>
                                <p className="text-danger-400 font-medium">Unable to load analytics</p>
                                <p className="text-dark-400 text-sm">{error}</p>
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={loadMetrics}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Retry
                        </Button>
                    </div>
                </Card>
            )}

            {/* No Agent Selected */}
            {!selectedAgent && !isLoading && (
                <Card className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-dark-600" />
                    <p className="text-dark-400">Select an agent from the header to view conversation analytics.</p>
                </Card>
            )}

            {/* Main Content - Only show when we have metrics */}
            {metrics && !isLoading && (
                <>
                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {primaryStats.map((stat) => (
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

                    {/* Secondary Stats Grid (New KPIs) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {secondaryStats.map((stat) => (
                            <Card key={stat.title} className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={clsx('p-2 rounded-lg', stat.bgColor)}>
                                        <stat.icon className={clsx('w-4 h-4', stat.iconColor)} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-dark-50">{stat.value}</p>
                                        <p className="text-xs text-dark-500">{stat.title}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Match Type Distribution */}
                        <Card>
                            <CardHeader
                                title="Match Type Distribution"
                                subtitle="How user inputs are handled"
                            />
                            <CardContent>
                                {matchTypeData.length > 0 ? (
                                    <DonutChart
                                        data={matchTypeData}
                                        centerValue={totalMatches.toString()}
                                        centerLabel="Total Matches"
                                    />
                                ) : (
                                    <div className="py-8 text-center text-dark-500">No match data available</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Intents */}
                        <Card>
                            <CardHeader
                                title="Top Intents"
                                subtitle="Most triggered intents"
                            />
                            <CardContent>
                                {metrics.topIntents.length > 0 ? (
                                    <div className="space-y-3">
                                        {metrics.topIntents.slice(0, 6).map((intent, idx) => (
                                            <div key={intent.name} className="flex items-center gap-3">
                                                <span className="text-xs text-dark-500 w-4">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-dark-200 truncate">{intent.name}</p>
                                                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className="h-full bg-primary-500 rounded-full"
                                                            style={{ width: `${(intent.count / (metrics.topIntents[0]?.count || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium text-dark-300">{intent.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-dark-500">No intent data available</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Pages */}
                        <Card>
                            <CardHeader
                                title="Top Pages"
                                subtitle="Most visited conversation pages"
                            />
                            <CardContent>
                                {metrics.topPages.length > 0 ? (
                                    <div className="space-y-3">
                                        {metrics.topPages.slice(0, 6).map((page, idx) => (
                                            <div key={page.name} className="flex items-center gap-3">
                                                <span className="text-xs text-dark-500 w-4">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-dark-200 truncate">{page.name}</p>
                                                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full"
                                                            style={{ width: `${(page.count / (metrics.topPages[0]?.count || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium text-dark-300">{page.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-dark-500">No page data available</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Missing Transitions, Step Metrics & Recent Conversations */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Missing Transitions */}
                        <Card>
                            <CardHeader
                                title="Missing Transitions"
                                subtitle="Potential missed intent handlers"
                                action={
                                    <Link to="/coverage">
                                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                            Full Report
                                        </Button>
                                    </Link>
                                }
                            />
                            <CardContent>
                                {metrics.missingTransitions.length > 0 ? (
                                    <div className="space-y-2">
                                        {metrics.missingTransitions.slice(0, 5).map((mt, idx) => (
                                            <div
                                                key={`${mt.conversationId}-${idx}`}
                                                className="flex items-center gap-2 p-2 bg-warning-500/10 border border-warning-500/20 rounded-lg"
                                            >
                                                <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" />
                                                <p className="text-sm text-dark-200 truncate flex-1">{mt.intentDisplayName}</p>
                                                <span className="text-xs text-dark-500">{(mt.score * 100).toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-dark-500">
                                        <CheckCircle className="w-6 h-6 mx-auto mb-2 text-success-500" />
                                        <p className="text-sm">No missing transitions</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Step Metrics */}
                        <Card>
                            <CardHeader
                                title="Processing Latency"
                                subtitle="Average latency by step"
                            />
                            <CardContent>
                                {metrics.stepMetrics.length > 0 ? (
                                    <div className="space-y-2">
                                        {metrics.stepMetrics.slice(0, 5).map((step) => (
                                            <div key={step.name} className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-dark-200 truncate">{step.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-dark-200">{step.avgLatencyMs.toFixed(0)}ms</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-dark-500">
                                        <Activity className="w-6 h-6 mx-auto mb-2 text-dark-600" />
                                        <p className="text-sm">No step metrics available</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Conversations */}
                        <Card>
                            <CardHeader
                                title="Recent Conversations"
                                subtitle="Latest user interactions"
                                action={
                                    <Link to="/results">
                                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                            View All
                                        </Button>
                                    </Link>
                                }
                            />
                            <CardContent>
                                <div className="space-y-2">
                                    {metrics.recentConversations.slice(0, 5).map((conv) => (
                                        <div
                                            key={conv.id}
                                            className="flex items-center gap-3 p-2 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer"
                                        >
                                            <div
                                                className={clsx(
                                                    'w-8 h-8 rounded-lg flex items-center justify-center',
                                                    conv.hasLiveAgentHandoff
                                                        ? 'bg-purple-500/20'
                                                        : conv.hasEndInteraction
                                                            ? 'bg-success-500/20'
                                                            : 'bg-primary-500/20'
                                                )}
                                            >
                                                {conv.hasLiveAgentHandoff ? (
                                                    <Users className="w-4 h-4 text-purple-500" />
                                                ) : conv.hasEndInteraction ? (
                                                    <CheckCircle className="w-4 h-4 text-success-500" />
                                                ) : (
                                                    <MessageSquare className="w-4 h-4 text-primary-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-dark-200 truncate">
                                                    {conv.interactionCount} turns • {conv.duration || 'N/A'}
                                                </p>
                                                <p className="text-xs text-dark-500">
                                                    {conv.startTime ? format(new Date(conv.startTime), 'MMM d, h:mm a') : '-'}
                                                </p>
                                            </div>
                                            <span className="text-xs text-dark-400">{((conv.avgMatchConfidence || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                    ))}
                                    {metrics.recentConversations.length === 0 && (
                                        <div className="py-6 text-center text-dark-500">No recent conversations</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
