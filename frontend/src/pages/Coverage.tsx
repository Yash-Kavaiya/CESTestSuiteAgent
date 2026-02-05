import { useState, useEffect } from 'react';
import {
    Shield,
    GitBranch,
    AlertTriangle,
    CheckCircle,
    Info,
    Loader2,
    RefreshCw,
    TrendingUp,
    Target,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import clsx from 'clsx';
import { useAgentStore } from '../store/useAgentStore';
import {
    coverageApi,
    AllCoverageData,
} from '../api/coverage';
import { getCache, setCache, CACHE_KEYS } from '../utils/cache';

type CoverageTab = 'intents' | 'transitions' | 'routeGroups';

export default function Coverage() {
    const { selectedAgent } = useAgentStore();
    const [activeTab, setActiveTab] = useState<CoverageTab>('intents');

    // State for all coverage data
    const [allCoverageData, setAllCoverageData] = useState<AllCoverageData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Load cached data immediately when agent changes
    useEffect(() => {
        if (selectedAgent) {
            const cachedData = getCache<AllCoverageData>(CACHE_KEYS.COVERAGE_DATA, selectedAgent.id);
            if (cachedData) {
                setAllCoverageData(cachedData);
            }
        } else {
            setAllCoverageData(null);
        }
    }, [selectedAgent]);

    useEffect(() => {
        if (selectedAgent) {
            loadAllCoverage();
        }
    }, [selectedAgent]);

    const loadAllCoverage = async () => {
        if (!selectedAgent) {
            setError('Please select an agent first');
            return;
        }

        // If we have cached data, show refreshing indicator instead of full loading
        const hasCachedData = allCoverageData !== null;
        if (hasCachedData) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await coverageApi.calculateAllCoverage(selectedAgent.id);

            if (response.success && response.data) {
                setAllCoverageData(response.data);
                setLastUpdated(new Date());
                // Cache the fresh data
                setCache(CACHE_KEYS.COVERAGE_DATA, selectedAgent.id, response.data);
            } else {
                setError(response.error || 'Failed to load coverage data');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while loading coverage');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        loadAllCoverage();
    };

    if (!selectedAgent) {
        return (
            <div className="p-8 text-center text-dark-400">
                <Shield className="w-12 h-12 mx-auto mb-4 text-dark-600" />
                <p className="mb-4">Please select an agent to view coverage analysis.</p>
                <p className="text-sm text-dark-500">Go to Settings to configure an agent.</p>
            </div>
        );
    }

    // Only show full loading screen when loading AND no cached data
    if (loading && !allCoverageData) {
        return (
            <div className="p-8 text-center text-dark-400">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary-500 animate-spin" />
                <p>Loading coverage data from Dialogflow CX...</p>
            </div>
        );
    }

    const intentData = allCoverageData?.intentCoverage;
    const transitionData = allCoverageData?.pageTransitionCoverage;
    const routeGroupData = allCoverageData?.routeGroupCoverage;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary-700">
                        Coverage Analysis
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 inline ml-2 animate-spin text-primary-400" />
                        )}
                    </h1>
                    <p className="text-dark-400 mt-1">
                        Real-time test coverage from Dialogflow CX for {selectedAgent.displayName}
                    </p>
                    {lastUpdated && (
                        <p className="text-xs text-dark-500 mt-1">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                    >
                        {(loading || isRefreshing) ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-danger-500/10 border border-danger-500/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-danger-300">{error}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleRefresh}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Overview Stats */}
            {allCoverageData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Intent Coverage Card */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-500">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-dark-400 font-medium">Intent Coverage</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-2xl font-bold text-dark-50">
                                            {intentData?.coveragePercent || 0}%
                                        </span>
                                        <span className="text-sm text-dark-500">
                                            ({intentData?.coveredIntents || 0}/{intentData?.totalIntents || 0})
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${intentData?.coveragePercent || 0}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Page Transition Coverage Card */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-secondary-500/20 flex items-center justify-center text-secondary-500">
                                    <GitBranch className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-dark-400 font-medium">Page Transitions</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-2xl font-bold text-dark-50">
                                            {transitionData?.coveragePercent || 0}%
                                        </span>
                                        <span className="text-sm text-dark-500">
                                            ({transitionData?.coveredTransitions || 0}/{transitionData?.totalTransitions || 0})
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-secondary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${transitionData?.coveragePercent || 0}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Route Group Coverage Card */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center text-success-500">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-dark-400 font-medium">Route Groups</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-2xl font-bold text-dark-50">
                                            {routeGroupData?.coveragePercent || 0}%
                                        </span>
                                        <span className="text-sm text-dark-500">
                                            ({routeGroupData?.coveredRouteGroups || 0}/{routeGroupData?.totalRouteGroups || 0})
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-success-500 rounded-full transition-all duration-500"
                                    style={{ width: `${routeGroupData?.coveragePercent || 0}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Detailed Analysis */}
            {allCoverageData && (
                <Card>
                    <div className="border-b border-dark-600">
                        <div className="flex items-center gap-6 px-6">
                            <button
                                onClick={() => setActiveTab('intents')}
                                className={clsx(
                                    'py-4 text-sm font-medium border-b-2 transition-colors',
                                    activeTab === 'intents'
                                        ? 'border-primary-500 text-dark-50'
                                        : 'border-transparent text-dark-400 hover:text-dark-200'
                                )}
                            >
                                <Shield className="w-4 h-4 inline mr-2" />
                                Intents
                            </button>
                            <button
                                onClick={() => setActiveTab('transitions')}
                                className={clsx(
                                    'py-4 text-sm font-medium border-b-2 transition-colors',
                                    activeTab === 'transitions'
                                        ? 'border-primary-500 text-dark-50'
                                        : 'border-transparent text-dark-400 hover:text-dark-200'
                                )}
                            >
                                <GitBranch className="w-4 h-4 inline mr-2" />
                                Page Transitions
                            </button>
                            <button
                                onClick={() => setActiveTab('routeGroups')}
                                className={clsx(
                                    'py-4 text-sm font-medium border-b-2 transition-colors',
                                    activeTab === 'routeGroups'
                                        ? 'border-primary-500 text-dark-50'
                                        : 'border-transparent text-dark-400 hover:text-dark-200'
                                )}
                            >
                                <Target className="w-4 h-4 inline mr-2" />
                                Route Groups
                            </button>
                        </div>
                    </div>
                    <CardContent className="p-6">
                        {/* Intent Coverage Details */}
                        {activeTab === 'intents' && intentData && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-dark-50">Intent Coverage Details</h3>
                                    <div className="flex items-center gap-2 text-sm text-dark-400">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>{intentData.coveredIntents} covered, {intentData.uncoveredIntents} uncovered</span>
                                    </div>
                                </div>

                                {intentData.intents && intentData.intents.length > 0 ? (
                                    <div className="space-y-2">
                                        {intentData.intents.map((intent, index) => (
                                            <div
                                                key={index}
                                                className={clsx(
                                                    'flex items-center justify-between p-3 rounded-lg',
                                                    intent.covered
                                                        ? 'bg-success-500/10 border border-success-500/20'
                                                        : 'bg-danger-500/10 border border-danger-500/20'
                                                )}
                                            >
                                                <span className="flex items-center gap-2 text-dark-200">
                                                    {intent.covered ? (
                                                        <CheckCircle className="w-4 h-4 text-success-400" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-danger-400" />
                                                    )}
                                                    <span className="font-medium">{intent.displayName}</span>
                                                </span>
                                                <span
                                                    className={clsx(
                                                        'text-xs px-2 py-1 rounded',
                                                        intent.covered
                                                            ? 'bg-success-500/20 text-success-300'
                                                            : 'bg-danger-500/20 text-danger-300'
                                                    )}
                                                >
                                                    {intent.covered ? 'Covered' : 'Not Covered'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-dark-500">
                                        <Info className="w-8 h-8 mx-auto mb-2" />
                                        <p>No intent data available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Page Transition Details */}
                        {activeTab === 'transitions' && transitionData && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-dark-50">Page Transition Coverage</h3>
                                    <div className="flex items-center gap-2 text-sm text-dark-400">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>{transitionData.coveredTransitions} covered, {transitionData.uncoveredTransitions} uncovered</span>
                                    </div>
                                </div>

                                {transitionData.transitions && transitionData.transitions.length > 0 ? (
                                    <div className="space-y-2">
                                        {transitionData.transitions.map((transition, index) => (
                                            <div
                                                key={index}
                                                className={clsx(
                                                    'flex items-center justify-between p-3 rounded-lg',
                                                    transition.covered
                                                        ? 'bg-success-500/10 border border-success-500/20'
                                                        : 'bg-danger-500/10 border border-danger-500/20'
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {transition.covered ? (
                                                        <CheckCircle className="w-4 h-4 text-success-400" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-danger-400" />
                                                    )}
                                                    <div className="text-dark-200">
                                                        <div className="font-medium text-sm">
                                                            {transition.source || 'Unknown Source'}
                                                        </div>
                                                        <div className="text-xs text-dark-400">
                                                            → {transition.target || 'Unknown Target'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    className={clsx(
                                                        'text-xs px-2 py-1 rounded',
                                                        transition.covered
                                                            ? 'bg-success-500/20 text-success-300'
                                                            : 'bg-danger-500/20 text-danger-300'
                                                    )}
                                                >
                                                    {transition.covered ? 'Covered' : 'Not Covered'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-dark-500">
                                        <Info className="w-8 h-8 mx-auto mb-2" />
                                        <p>No transition data available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Route Group Details */}
                        {activeTab === 'routeGroups' && routeGroupData && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-dark-50">Route Group Coverage</h3>
                                    <div className="flex items-center gap-2 text-sm text-dark-400">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>{routeGroupData.coveredRouteGroups} covered, {routeGroupData.uncoveredRouteGroups} uncovered</span>
                                    </div>
                                </div>

                                {routeGroupData.routeGroups && routeGroupData.routeGroups.length > 0 ? (
                                    <div className="space-y-2">
                                        {routeGroupData.routeGroups.map((routeGroup, index) => (
                                            <div
                                                key={index}
                                                className={clsx(
                                                    'flex items-center justify-between p-3 rounded-lg',
                                                    routeGroup.covered
                                                        ? 'bg-success-500/10 border border-success-500/20'
                                                        : 'bg-danger-500/10 border border-danger-500/20'
                                                )}
                                            >
                                                <span className="flex items-center gap-2 text-dark-200">
                                                    {routeGroup.covered ? (
                                                        <CheckCircle className="w-4 h-4 text-success-400" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-danger-400" />
                                                    )}
                                                    <span className="font-medium">{routeGroup.displayName}</span>
                                                </span>
                                                <span
                                                    className={clsx(
                                                        'text-xs px-2 py-1 rounded',
                                                        routeGroup.covered
                                                            ? 'bg-success-500/20 text-success-300'
                                                            : 'bg-danger-500/20 text-danger-300'
                                                    )}
                                                >
                                                    {routeGroup.covered ? 'Covered' : 'Not Covered'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-dark-500">
                                        <Info className="w-8 h-8 mx-auto mb-2" />
                                        <p>No route group data available</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Help Section */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <Info className="w-5 h-5 text-primary-400 mt-1 flex-shrink-0" />
                        <div className="text-sm text-dark-300 space-y-2">
                            <p className="font-medium text-dark-100">About Coverage Analysis</p>
                            <p>
                                Coverage data is calculated in real-time from your Dialogflow CX agent using the official Google Cloud API.
                                This shows which intents, page transitions, and route groups are covered by your test cases.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-dark-400">
                                <li><strong>Intent Coverage:</strong> Measures which intents have been tested</li>
                                <li><strong>Page Transitions:</strong> Tracks tested conversation flow transitions</li>
                                <li><strong>Route Groups:</strong> Shows coverage of transition route groups</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
