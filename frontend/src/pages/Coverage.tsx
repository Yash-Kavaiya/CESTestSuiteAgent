import { useState, useEffect } from 'react';
import {
    Shield,
    Layout,
    GitBranch,
    AlertTriangle,
    CheckCircle,
    Info,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import clsx from 'clsx';
import { useSearchParams } from 'react-router-dom';
import { runsApi } from '../api/runs';

export default function Coverage() {
    const [activeTab, setActiveTab] = useState<'intents' | 'pages' | 'transitions'>('intents');
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const [coverageData, setCoverageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return <div className="p-8 text-center text-dark-400">Loading coverage data...</div>;
    }

    if (!coverageData) {
        return <div className="p-8 text-center text-dark-400">No coverage data available. Please run a simulation first.</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary-700">Coverage Analysis</h1>
                <p className="text-dark-400 mt-1">
                    Analyze test coverage across intents, pages, and conversation flows
                </p>
            </div>

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
                                    <span className="text-2xl font-bold text-dark-50">{coverageData.intentCoverage}%</span>
                                    <span className="text-sm text-dark-500">
                                        ({coverageData.testedIntents}/{coverageData.totalIntents})
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${coverageData.intentCoverage}%` }}
                            />
                        </div>
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
                                    <span className="text-2xl font-bold text-dark-50">{coverageData.pageCoverage}%</span>
                                    <span className="text-sm text-dark-500">
                                        ({coverageData.testedPages}/{coverageData.totalPages})
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-secondary-500 rounded-full transition-all duration-500"
                                style={{ width: `${coverageData.pageCoverage}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center text-success-500">
                                <GitBranch className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-dark-400 font-medium">Transitions</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    {/* Placeholder for now as transitionCoverage is hard to calc perfectly without graph */}
                                    <span className="text-2xl font-bold text-dark-50">{coverageData.transitionCoverage || 0}%</span>
                                    <span className="text-sm text-dark-500">Verified</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-dark-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-success-500 rounded-full transition-all duration-500"
                                style={{ width: `${coverageData.transitionCoverage || 0}%` }}
                            />
                        </div>
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
                    {/* Content would go here - placeholder for detailed list */}
                    <div className="p-8 text-center text-dark-400">
                        {activeTab === 'intents' && (
                            <div className="space-y-4 text-left">
                                <h3 className="text-lg font-medium text-dark-50 mb-4">Untested Intents</h3>
                                {coverageData.untestedIntents && coverageData.untestedIntents.length > 0 ? (
                                    <ul className="grid grid-cols-2 gap-2">
                                        {coverageData.untestedIntents.map((intent: string) => (
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
                                <h3 className="text-lg font-medium text-dark-50 mb-4">Untested Pages</h3>
                                {coverageData.untestedPages && coverageData.untestedPages.length > 0 ? (
                                    <ul className="grid grid-cols-2 gap-2">
                                        {coverageData.untestedPages.map((page: string) => (
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
