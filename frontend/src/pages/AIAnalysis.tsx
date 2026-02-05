import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Play,
    Download,
    RefreshCw,
    Loader,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Zap,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import AnalysisResult from '../components/ui/AnalysisResult';
import { aiAnalysisApi, ConversationSession, ConversationAnalysis, AnalysisSummary } from '../api/aiAnalysis';
import { useAgentStore } from '../store/useAgentStore';
import { getCache, setCache, CACHE_KEYS } from '../utils/cache';
import clsx from 'clsx';

interface SessionWithAnalysis extends ConversationSession {
    analysis?: ConversationAnalysis;
    analyzing?: boolean;
}

const AIAnalysis = () => {
    const { selectedAgent } = useAgentStore();
    const [sessions, setSessions] = useState<SessionWithAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [summary, setSummary] = useState<AnalysisSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const agentId = selectedAgent?.id;
    const projectId = selectedAgent?.projectId;
    const location = selectedAgent?.location;

    // Load cached data immediately when agent changes
    useEffect(() => {
        if (agentId) {
            const cachedSessions = getCache<SessionWithAnalysis[]>(CACHE_KEYS.AI_ANALYSIS_SESSIONS, agentId);
            const cachedSummary = getCache<AnalysisSummary>(CACHE_KEYS.AI_ANALYSIS_SUMMARY, agentId);

            if (cachedSessions) {
                setSessions(cachedSessions);
            }
            if (cachedSummary) {
                setSummary(cachedSummary);
            }
        } else {
            setSessions([]);
            setSummary(null);
        }
    }, [agentId]);

    useEffect(() => {
        if (agentId) {
            loadSessions();
            loadSummary();
        }
    }, [agentId, projectId, location]);

    const loadSessions = useCallback(async () => {
        if (!agentId || !projectId || !location) return;

        // If we have cached data, show refreshing indicator instead of full loading
        const hasCachedData = sessions.length > 0;
        if (hasCachedData) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await aiAnalysisApi.getSessions(projectId, location, agentId, 100);

            // Load analysis results for sessions that have them
            const sessionsWithAnalysis: SessionWithAnalysis[] = await Promise.all(
                response.sessions.map(async (session) => {
                    if (session.hasAnalysis) {
                        try {
                            const analysis = await aiAnalysisApi.getAnalysisResult(
                                session.sessionId,
                                agentId
                            );
                            return { ...session, analysis };
                        } catch (error) {
                            console.error(`Failed to load analysis for ${session.sessionId}:`, error);
                            return session;
                        }
                    }
                    return session;
                })
            );

            setSessions(sessionsWithAnalysis);
            // Cache the fresh data
            setCache(CACHE_KEYS.AI_ANALYSIS_SESSIONS, agentId, sessionsWithAnalysis);
        } catch (error: any) {
            setError(error.message || 'Failed to load sessions');
            console.error('Load sessions error:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [agentId, projectId, location, sessions.length]);

    const loadSummary = useCallback(async () => {
        if (!agentId) return;

        try {
            const summaryData = await aiAnalysisApi.getSummary(agentId);
            setSummary(summaryData);
            // Cache the summary data
            setCache(CACHE_KEYS.AI_ANALYSIS_SUMMARY, agentId, summaryData);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    }, [agentId]);

    const handleAnalyzeSession = async (sessionId: string) => {
        if (!agentId || !projectId || !location) return;

        try {
            setAnalyzing(sessionId);
            setError(null);

            const analysis = await aiAnalysisApi.analyzeSession(
                sessionId,
                projectId,
                location,
                agentId
            );

            // Update local state
            setSessions((prev) => {
                const updatedSessions = prev.map((session) =>
                    session.sessionId === sessionId
                        ? { ...session, analysis, hasAnalysis: true, analyzing: false }
                        : session
                );
                // Update cache with new analysis
                setCache(CACHE_KEYS.AI_ANALYSIS_SESSIONS, agentId, updatedSessions);
                return updatedSessions;
            });

            setSuccessMessage(`Analysis completed for session ${sessionId}`);
            setTimeout(() => setSuccessMessage(null), 3000);

            // Reload summary
            await loadSummary();
        } catch (error: any) {
            setError(error.message || 'Failed to analyze session');
            console.error('Analyze session error:', error);
        } finally {
            setAnalyzing(null);
        }
    };

    const handleBulkAnalyze = async () => {
        if (!agentId || !projectId || !location) return;

        try {
            setBulkAnalyzing(true);
            setError(null);

            const selectedIds = selectedSessions.size > 0 ? Array.from(selectedSessions) : undefined;

            const result = await aiAnalysisApi.bulkAnalyze(
                projectId,
                location,
                agentId,
                selectedIds
            );

            // Update sessions with new analyses
            setSessions((prev) => {
                const updatedSessions = prev.map((session) => {
                    const newAnalysis = result.analyses.find((a) => a.sessionId === session.sessionId);
                    return newAnalysis
                        ? { ...session, analysis: newAnalysis, hasAnalysis: true }
                        : session;
                });
                // Update cache with new analyses
                setCache(CACHE_KEYS.AI_ANALYSIS_SESSIONS, agentId, updatedSessions);
                return updatedSessions;
            });

            setSuccessMessage(`Bulk analysis completed: ${result.totalAnalyzed} sessions analyzed`);
            setTimeout(() => setSuccessMessage(null), 3000);
            setSelectedSessions(new Set());

            // Reload summary
            await loadSummary();
        } catch (error: any) {
            setError(error.message || 'Failed to bulk analyze sessions');
            console.error('Bulk analyze error:', error);
        } finally {
            setBulkAnalyzing(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            setError(null);
            const result = await aiAnalysisApi.exportAnalyses(agentId, 'csv');
            
            // Ensure we have a Blob
            const csvBlob = result instanceof Blob ? result : new Blob([JSON.stringify(result)], { type: 'text/csv' });

            // Create download link
            const url = window.URL.createObjectURL(csvBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ai-analysis-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSuccessMessage('Analysis exported successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error: any) {
            setError(error.message || 'Failed to export analysis');
            console.error('Export error:', error);
        }
    };

    const toggleSessionSelection = (sessionId: string) => {
        setSelectedSessions((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(sessionId)) {
                newSet.delete(sessionId);
            } else {
                newSet.add(sessionId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedSessions.size === sessions.length) {
            setSelectedSessions(new Set());
        } else {
            setSelectedSessions(new Set(sessions.map((s) => s.sessionId)));
        }
    };

    const analyzedCount = useMemo(() => sessions.filter((s) => s.hasAnalysis).length, [sessions]);

    if (!selectedAgent) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card>
                    <CardContent className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <p className="text-gray-600">Please select an agent first</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    AI Analysis
                    {isRefreshing && (
                        <Loader className="w-5 h-5 inline ml-2 animate-spin text-blue-500" />
                    )}
                </h1>
                <p className="text-gray-600 mt-1">
                    Analyze conversation transcripts using AI to extract insights
                </p>
            </div>

            {/* Error & Success Messages */}
            {error && (
                <Card className="border-2 border-red-200 bg-red-50">
                    <CardContent className="flex items-center gap-3 py-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-800">{error}</p>
                    </CardContent>
                </Card>
            )}

            {successMessage && (
                <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="flex items-center gap-3 py-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-green-800">{successMessage}</p>
                    </CardContent>
                </Card>
            )}

            {/* Summary Statistics */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Total Analyses</p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {summary.totalAnalyses}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Avg Satisfaction</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {summary.avgSatisfactionScore?.toFixed(1) || '0.0'}/5
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">FCR Rate</p>
                                <p className="text-3xl font-bold text-purple-600">
                                    {summary.firstContactResolutionRate?.toFixed(1) || '0.0'}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Escalation Rate</p>
                                <p className="text-3xl font-bold text-orange-600">
                                    {summary.escalationRate?.toFixed(1) || '0.0'}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Controls */}
            <Card>
                <CardHeader title="Analysis Controls" />
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={handleBulkAnalyze}
                            disabled={bulkAnalyzing || sessions.length === 0}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {bulkAnalyzing ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Bulk Analyze {selectedSessions.size > 0 ? `(${selectedSessions.size})` : 'All'}
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleExportCSV}
                            disabled={analyzedCount === 0}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV ({analyzedCount})
                        </Button>

                        <Button
                            onClick={loadSessions}
                            disabled={loading || isRefreshing}
                            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
                        >
                            <RefreshCw className={clsx('w-4 h-4', (loading || isRefreshing) && 'animate-spin')} />
                            Refresh
                        </Button>
                    </div>

                    {/* Progress Bar */}
                    {sessions.length > 0 && (
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold">Analysis Progress</span>
                                <span className="text-sm text-gray-600">
                                    {analyzedCount} of {sessions.length}
                                </span>
                            </div>
                            <ProgressBar
                                value={analyzedCount}
                                max={sessions.length}
                                size="md"
                                showLabel
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sessions List */}
            {loading && sessions.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                        <p className="text-gray-600 mt-2">Loading conversations...</p>
                    </CardContent>
                </Card>
            ) : !loading && sessions.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">No conversations found for this agent</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {/* Select All */}
                    {sessions.length > 1 && (
                        <Card className="bg-gray-50">
                            <CardContent className="py-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedSessions.size === sessions.length}
                                        onChange={handleSelectAll}
                                        className="w-5 h-5 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-semibold">
                                        Select All ({sessions.length})
                                    </span>
                                </label>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sessions */}
                    {sessions.map((session) => (
                        <Card key={session.sessionId}>
                            <div
                                className="cursor-pointer"
                                onClick={() =>
                                    setExpandedSession(
                                        expandedSession === session.sessionId ? null : session.sessionId
                                    )
                                }
                            >
                                <div className="p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedSessions.has(session.sessionId)}
                                                onChange={() => toggleSessionSelection(session.sessionId)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-5 h-5 text-blue-600 rounded flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {session.sessionId}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {session.turnCount} turns •{' '}
                                                    {session.duration || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {session.hasAnalysis ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-gray-400" />
                                            )}

                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAnalyzeSession(session.sessionId);
                                                }}
                                                disabled={analyzing === session.sessionId}
                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                                            >
                                                {analyzing === session.sessionId ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                        Analyzing...
                                                    </>
                                                ) : session.hasAnalysis ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4" />
                                                        Re-analyze
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4" />
                                                        Analyze
                                                    </>
                                                )}
                                            </Button>

                                            {expandedSession === session.sessionId ? (
                                                <ChevronUp className="w-5 h-5 text-gray-600" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedSession === session.sessionId && (
                                    <CardContent className="border-t pt-6">
                                        {session.analysis ? (
                                            <AnalysisResult analysis={session.analysis} />
                                        ) : (
                                            <div className="text-center py-8">
                                                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-600">
                                                    No analysis available. Click "Analyze" to generate.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AIAnalysis;
