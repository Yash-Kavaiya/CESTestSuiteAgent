import React from 'react';
import { ConversationAnalysis } from '../../api/aiAnalysis';
import {
    AlertCircle,
    CheckCircle,
    XCircle,
    TrendingUp,
    Users,
    Lightbulb,
    Target,
} from 'lucide-react';
import Card, { CardContent } from './Card';
import clsx from 'clsx';

interface AnalysisResultProps {
    analysis: ConversationAnalysis;
    loading?: boolean;
}

const getSatisfactionColor = (level: string) => {
    switch (level) {
        case 'very_satisfied':
            return 'bg-green-100 text-green-800 border-green-300';
        case 'satisfied':
            return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'neutral':
            return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'dissatisfied':
            return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'very_dissatisfied':
            return 'bg-red-100 text-red-800 border-red-300';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};

const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
        case 'positive':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'negative':
            return <XCircle className="w-5 h-5 text-red-500" />;
        case 'neutral':
            return <AlertCircle className="w-5 h-5 text-gray-500" />;
        case 'mixed':
            return <TrendingUp className="w-5 h-5 text-blue-500" />;
        default:
            return null;
    }
};

// Simple section header component
const SectionHeader = ({ icon, title, className }: { icon?: React.ReactNode; title: string; className?: string }) => (
    <div className={clsx('flex items-center gap-2 mb-3', className)}>
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
    </div>
);

export const AnalysisResult = ({ analysis, loading = false }: AnalysisResultProps) => {
    if (loading) {
        return (
            <Card className="space-y-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary */}
            <Card>
                <SectionHeader title="Summary" />
                <p className="text-gray-700">{analysis.summary}</p>
            </Card>

            {/* Core Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Situation */}
                <Card>
                    <SectionHeader icon={<Target className="w-5 h-5 text-blue-500" />} title="Situation" />
                    <p className="text-gray-700 text-sm">{analysis.situation}</p>
                </Card>

                {/* Action */}
                <Card>
                    <SectionHeader icon={<Users className="w-5 h-5 text-purple-500" />} title="Action Taken" />
                    <p className="text-gray-700 text-sm">{analysis.action}</p>
                </Card>

                {/* Resolution */}
                <Card>
                    <SectionHeader icon={<CheckCircle className="w-5 h-5 text-green-500" />} title="Resolution" />
                    <p className="text-gray-700 text-sm">{analysis.resolution}</p>
                </Card>

                {/* Cancellation Reason */}
                {analysis.reasonForCancellation && (
                    <Card>
                        <SectionHeader icon={<AlertCircle className="w-5 h-5 text-red-500" />} title="Cancellation Reason" />
                        <p className="text-gray-700 text-sm">{analysis.reasonForCancellation}</p>
                    </Card>
                )}
            </div>

            {/* Satisfaction & Sentiment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Customer Satisfaction */}
                <Card>
                    <SectionHeader title="Customer Satisfaction" />
                    <div className="space-y-3">
                        <div
                            className={clsx(
                                'px-4 py-2 rounded-lg border font-semibold text-center inline-block w-full',
                                getSatisfactionColor(analysis.customerSatisfaction.level)
                            )}
                        >
                            {analysis.customerSatisfaction.level.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm">Score</span>
                            <span className="font-semibold text-lg">
                                {analysis.customerSatisfaction.score}/5
                            </span>
                        </div>
                        <p className="text-gray-700 text-sm">
                            {analysis.customerSatisfaction.explanation}
                        </p>
                    </div>
                </Card>

                {/* Sentiment Analysis */}
                <Card>
                    <SectionHeader title="Sentiment Analysis" />
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            {getSentimentIcon(analysis.sentimentAnalysis.overall)}
                            <span className="font-semibold text-lg">
                                {analysis.sentimentAnalysis.overall.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm">Score</span>
                            <span className="font-semibold">
                                {(analysis.sentimentAnalysis.score * 100).toFixed(1)}%
                            </span>
                        </div>
                        {analysis.sentimentAnalysis.progression.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-semibold text-gray-600 mb-2">
                                    Sentiment Progression:
                                </p>
                                <div className="flex gap-1">
                                    {analysis.sentimentAnalysis.progression.map((prog, idx) => (
                                        <div
                                            key={idx}
                                            className={clsx(
                                                'flex-1 h-2 rounded',
                                                prog.sentiment === 'positive'
                                                    ? 'bg-green-500'
                                                    : prog.sentiment === 'negative'
                                                      ? 'bg-red-500'
                                                      : 'bg-gray-400'
                                            )}
                                            title={`Turn ${prog.turn}: ${prog.sentiment}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Root Cause Analysis */}
            {analysis.rootCauseAnalysis?.identified && (
                <Card className="border-2 border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-lg text-red-900">Root Cause Analysis</h3>
                    </div>
                    <div className="space-y-4">
                        {analysis.rootCauseAnalysis.primaryCause && (
                            <div>
                                <h4 className="font-semibold text-red-800 mb-1">Primary Cause:</h4>
                                <p className="text-gray-700 text-sm">
                                    {analysis.rootCauseAnalysis.primaryCause}
                                </p>
                            </div>
                        )}

                        {analysis.rootCauseAnalysis.callerIntention && (
                            <div>
                                <h4 className="font-semibold text-red-800 mb-1">Caller Intention:</h4>
                                <p className="text-gray-700 text-sm">
                                    {analysis.rootCauseAnalysis.callerIntention}
                                </p>
                            </div>
                        )}

                        {analysis.rootCauseAnalysis.contributingFactors.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-red-800 mb-2">
                                    Contributing Factors:
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {analysis.rootCauseAnalysis.contributingFactors.map(
                                        (factor, idx) => (
                                            <li key={idx} className="text-gray-700 text-sm">
                                                {factor}
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}

                        {analysis.rootCauseAnalysis.systemIssues.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-red-800 mb-2">System Issues:</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {analysis.rootCauseAnalysis.systemIssues.map((issue, idx) => (
                                        <li key={idx} className="text-gray-700 text-sm">
                                            {issue}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Suggested Solutions */}
            {analysis.suggestedSolutions && analysis.suggestedSolutions.length > 0 && (
                <Card className="border-2 border-green-200 bg-green-50">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-lg text-green-900">Suggested Solutions</h3>
                    </div>
                    <ul className="list-disc list-inside space-y-2">
                        {analysis.suggestedSolutions.map((solution, idx) => (
                            <li key={idx} className="text-gray-700 text-sm">
                                {solution}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Entities */}
            {analysis.entities.length > 0 && (
                <Card>
                    <SectionHeader title="Extracted Entities" />
                    <div className="space-y-2">
                        {analysis.entities.map((entity, idx) => (
                            <div
                                key={idx}
                                className="flex gap-3 p-2 bg-gray-50 rounded border border-gray-200"
                            >
                                <div className="font-semibold text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                                    {entity.type}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{entity.value}</p>
                                    <p className="text-xs text-gray-600">{entity.context}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* KPIs */}
            <Card>
                <SectionHeader title="Key Performance Indicators" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* First Contact Resolution */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600">First Contact Resolution</p>
                        <p className="text-lg font-semibold text-blue-900">
                            {analysis.additionalKPIs.firstContactResolution ? 'Yes' : 'No'}
                        </p>
                    </div>

                    {/* Escalation Required */}
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-gray-600">Escalation Required</p>
                        <p className="text-lg font-semibold text-orange-900">
                            {analysis.additionalKPIs.escalationRequired ? 'Yes' : 'No'}
                        </p>
                    </div>

                    {/* Transfer Count */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-gray-600">Transfers</p>
                        <p className="text-lg font-semibold text-purple-900">
                            {analysis.additionalKPIs.transferCount}
                        </p>
                    </div>

                    {/* Customer Effort Score */}
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-600">Customer Effort</p>
                        <p className="text-lg font-semibold text-green-900 capitalize">
                            {analysis.additionalKPIs.customerEffortScore}
                        </p>
                    </div>

                    {/* Response Time */}
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm text-gray-600">Avg Response Time</p>
                        <p className="text-lg font-semibold text-indigo-900">
                            {analysis.additionalKPIs.avgResponseTime}
                        </p>
                    </div>

                    {/* Resolution Time */}
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                        <p className="text-sm text-gray-600">Resolution Time</p>
                        <p className="text-lg font-semibold text-teal-900">
                            {analysis.additionalKPIs.resolutionTime}
                        </p>
                    </div>

                    {/* Issue Category */}
                    <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                        <p className="text-sm text-gray-600">Issue Category</p>
                        <p className="text-lg font-semibold text-pink-900">
                            {analysis.additionalKPIs.issueCategory}
                        </p>
                    </div>

                    {/* Issue Subcategory */}
                    <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                        <p className="text-sm text-gray-600">Issue Subcategory</p>
                        <p className="text-lg font-semibold text-cyan-900">
                            {analysis.additionalKPIs.issueSubcategory}
                        </p>
                    </div>

                    {/* Follow-up Required */}
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-gray-600">Follow-up Required</p>
                        <p className="text-lg font-semibold text-red-900">
                            {analysis.additionalKPIs.followUpRequired ? 'Yes' : 'No'}
                        </p>
                    </div>
                </div>

                {/* Agent Performance */}
                <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-4">Agent Performance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Professionalism',
                                value: analysis.additionalKPIs.agentPerformance.professionalism,
                            },
                            {
                                label: 'Empathy',
                                value: analysis.additionalKPIs.agentPerformance.empathy,
                            },
                            {
                                label: 'Problem Solving',
                                value: analysis.additionalKPIs.agentPerformance.problemSolving,
                            },
                            {
                                label: 'Communication',
                                value: analysis.additionalKPIs.agentPerformance.communication,
                            },
                        ].map((perf, idx) => (
                            <div key={idx} className="text-center">
                                <p className="text-sm text-gray-600 mb-1">{perf.label}</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {perf.value}
                                    </span>
                                    <span className="text-gray-500">/5</span>
                                </div>
                                <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: `${(perf.value / 5) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Analyzed At */}
            <div className="text-sm text-gray-500 text-right">
                Analyzed at: {new Date(analysis.analyzedAt).toLocaleString()}
            </div>
        </div>
    );
};

export default AnalysisResult;
