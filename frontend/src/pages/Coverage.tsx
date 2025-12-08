import { useState, useEffect } from 'react';
import {
    Shield,
    Layout,
    GitBranch,
    AlertTriangle,
    CheckCircle,
    Info,
    Loader2,
    RefreshCw,
    MessageSquare,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import clsx from 'clsx';
import { useSearchParams } from 'react-router-dom';
import { runsApi } from '../api/runs';
import { conversationsApi, CoverageAnalytics } from '../api/conversations';
import { useAgentStore } from '../store/useAgentStore';

export default function Coverage() {
    const [activeTab, setActiveTab] = useState<'intents' | 'pages' | 'transitions'>('intents');
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const [coverageData, setCoverageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Live conversation coverage
    const { selectedAgent } = useAgentStore();
    const [liveAnalytics, setLiveAnalytics] = useState<CoverageAnalytics | null>(null);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveError, setLiveError] = useState<string | null>(null);
    const [showLiveData, setShowLiveData] = useState(false);

    useEffect(() => {
        if (runId) {
            loadCoverage(runId);
        } else {
            loadLatestRunCoverage();
        }
    }, [runId]);

    const loadLatestRunCoverage = async () => {
        try {
            setLoading(true);
            const response = await runsApi.list();
            if (response.success && response.data && response.data.length > 0) {
                loadCoverage(response.data[0].id);
            } else {
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const loadCoverage = async (id: string) => {
        try {
            setLoading(true);
            const data = await runsApi.getCoverage(id);
            if (data.success) {
                setCoverageData(data.data);
            }
        } catch (error) {
            console.error('Failed to load coverage', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLiveAnalytics = async () => {
        if (!selectedAgent) return;

        setLiveLoading(true);
        setLiveError(null);

        try {
            const response = await conversationsApi.getCoverageAnalytics(selectedAgent, 100);
            if (response.success && response.data) {
                setLiveAnalytics(response.data);
                setShowLiveData(true);
            } else {
                setLiveError(response.error || 'Failed to load live analytics');
            }
        } catch (error: any) {
            setLiveError(error.message || 'Failed to load live analytics');
        } finally {
            setLiveLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-dark-400">Loading coverage data...</div>;
    }

    // Determine which data to display
    const displayData = showLiveData && liveAnalytics ? {
        intentCoverage: 0, // Can't calculate % without knowing total intents in agent
        testedIntents: liveAnalytics.intentCount,
        totalIntents: liveAnalytics.intentCount,
        pageCoverage: 0,
        testedPages: liveAnalytics.pageCount,
        totalPages: liveAnalytics.pageCount,
        transitionCoverage: 0,
        untestedIntents: [],
        untestedPages: [],
        intentCounts: liveAnalytics.intentCounts,
        pageCounts: liveAnalytics.pageCounts,
        uniqueIntents: liveAnalytics.uniqueIntents,
        uniquePages: liveAnalytics.uniquePages,
        totalConversations: liveAnalytics.totalConversations,
    } : coverageData;

    if (!displayData) {
        return (
            <div className="p-8 text-center text-dark-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-dark-600" />
                <p className="mb-4">No coverage data available. Please run a simulation first.</p>
                {selectedAgent && (
                    <Button onClick={loadLiveAnalytics} disabled={liveLoading}>
                        {liveLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Load from Conversation History
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary-700">Coverage Analysis</h1>
                    <p className="text-dark-400 mt-1">
                        Analyze test coverage across intents, pages, and conversation flows
                    </p>
                </div>
                {selectedAgent && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showLiveData ? 'primary' : 'secondary'}
                            onClick={() => {
                                if (!liveAnalytics) {
                                    loadLiveAnalytics();
                                } else {
                                    setShowLiveData(!showLiveData);
                                }
                            }}
                            disabled={liveLoading}
                        >
                            {liveLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <MessageSquare className="w-4 h-4 mr-2" />
                            )}
                            {showLiveData ? 'Showing Live Data' : 'Load Live Conversations'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Data Source Indicator */}
            {showLiveData && liveAnalytics && (
                <div className="flex items-center gap-2 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-primary-300">
                        Showing data from {liveAnalytics.totalConversations} real conversations
                    </span>
                    <button
                        onClick={() => setShowLiveData(false)}
                        className="ml-auto text-xs text-primary-400 hover:text-primary-300"
                    >
                        Switch to Test Data
                    </button>
                </div>
            )}

            {liveError && (
                <div className="flex items-center gap-2 p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-danger-400" />
                    <span className="text-sm text-danger-300">{liveError}</span>
                </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-500">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-dark-400 font-medium">Intent Coverage</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    {showLiveData ? (
                                        <>
                                            <span className="text-2xl font-bold text-dark-50">{displayData.testedIntents}</span>
                                            <span className="text-sm text-dark-500">unique intents used</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold text-dark-50">{displayData.intentCoverage}%</span>
                                            <span className="text-sm text-dark-500">
                                                ({displayData.testedIntents}/{displayData.totalIntents})
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!showLiveData && (
                            <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${displayData.intentCoverage}%` }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary-500/20 flex items-center justify-center text-secondary-500">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-dark-400 font-medium">Page Coverage</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    {showLiveData ? (
                                        <>
                                            <span className="text-2xl font-bold text-dark-50">{displayData.testedPages}</span>
                                            <span className="text-sm text-dark-500">unique pages visited</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold text-dark-50">{displayData.pageCoverage}%</span>
                                            <span className="text-sm text-dark-500">
                                                ({displayData.testedPages}/{displayData.totalPages})
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!showLiveData && (
                            <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-secondary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${displayData.pageCoverage}%` }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center text-success-500">
                                <GitBranch className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-dark-400 font-medium">
                                    {showLiveData ? 'Conversations' : 'Transitions'}
                                </p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    {showLiveData ? (
                                        <>
                                            <span className="text-2xl font-bold text-dark-50">{displayData.totalConversations}</span>
                                            <span className="text-sm text-dark-500">analyzed</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold text-dark-50">{displayData.transitionCoverage || 0}%</span>
                                            <span className="text-sm text-dark-500">Verified</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!showLiveData && (
                            <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-success-500 rounded-full transition-all duration-500"
                                    style={{ width: `${displayData.transitionCoverage || 0}%` }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analysis */}
            <Card>
                <div className="border-b border-dark-600">
                    <div className="flex items-center gap-6 px-6">
                        {(['intents', 'pages', 'transitions'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={clsx(
                                    'py-4 text-sm font-medium border-b-2 transition-colors',
                                    activeTab === tab
                                        ? 'border-primary-500 text-dark-50'
                                        : 'border-transparent text-dark-400 hover:text-dark-200'
                                )}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <CardContent className="p-0">
                    <div className="p-8 text-center text-dark-400">
                        {activeTab === 'intents' && (
                            <div className="space-y-4 text-left">
                                <h3 className="text-lg font-medium text-dark-50 mb-4">
                                    {showLiveData ? 'Intents Used in Conversations' : 'Untested Intents'}
                                </h3>
                                {showLiveData && displayData.uniqueIntents ? (
                                    <div className="space-y-3">
                                        {displayData.uniqueIntents.map((intent: string) => (
                                            <div key={intent} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                                                <span className="flex items-center gap-2 text-dark-200">
                                                    <CheckCircle className="w-4 h-4 text-success-400" />
                                                    {intent}
                                                </span>
                                                <span className="text-sm text-dark-400">
                                                    {displayData.intentCounts?.[intent] || 0} times
                                                </span>
                                            </div>
                                        ))}
                                        {displayData.uniqueIntents.length === 0 && (
                                            <p className="text-dark-500">No intents found in conversations.</p>
                                        )}
                                    </div>
                                ) : displayData.untestedIntents && displayData.untestedIntents.length > 0 ? (
                                    <ul className="grid grid-cols-2 gap-2">
                                        {displayData.untestedIntents.map((intent: string) => (
                                            <li key={intent} className="flex items-center gap-2 text-danger-400">
                                                <AlertTriangle className="w-4 h-4" /> {intent}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-success-400 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> All known intents covered!
                                    </p>
                                )}
                            </div>
                        )}
                        {activeTab === 'pages' && (
                            <div className="space-y-4 text-left">
                                <h3 className="text-lg font-medium text-dark-50 mb-4">
                                    {showLiveData ? 'Pages Visited in Conversations' : 'Untested Pages'}
                                </h3>
                                {showLiveData && displayData.uniquePages ? (
                                    <div className="space-y-3">
                                        {displayData.uniquePages.map((page: string) => (
                                            <div key={page} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                                                <span className="flex items-center gap-2 text-dark-200">
                                                    <Layout className="w-4 h-4 text-secondary-400" />
                                                    {page}
                                                </span>
                                                <span className="text-sm text-dark-400">
                                                    {displayData.pageCounts?.[page] || 0} visits
                                                </span>
                                            </div>
                                        ))}
                                        {displayData.uniquePages.length === 0 && (
                                            <p className="text-dark-500">No pages found in conversations.</p>
                                        )}
                                    </div>
                                ) : displayData.untestedPages && displayData.untestedPages.length > 0 ? (
                                    <ul className="grid grid-cols-2 gap-2">
                                        {displayData.untestedPages.map((page: string) => (
                                            <li key={page} className="flex items-center gap-2 text-danger-400">
                                                <Layout className="w-4 h-4" /> {page}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-success-400 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> All known pages visited!
                                    </p>
                                )}
                            </div>
                        )}
                        {activeTab === 'transitions' && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Info className="w-12 h-12 text-dark-600 mb-4" />
                                <p>Transition flow graph visualization coming soon.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
