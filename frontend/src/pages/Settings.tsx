import { useState } from 'react';
import {
    Settings as SettingsIcon,
    Key,
    Database,
    Sliders,
    Save,
    Upload,
    Trash2,
    Plus,
    Check,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAgentStore } from '../store/useAgentStore';
import { Agent } from '../types';
import clsx from 'clsx';

export default function Settings() {
    const { agents, setAgents, selectedAgent, setSelectedAgent } = useAgentStore();
    const [activeTab, setActiveTab] = useState<'agents' | 'comparison' | 'export'>(
        'agents'
    );

    // Form states
    const [projectId, setProjectId] = useState('');
    const [location, setLocation] = useState('us-central1');
    const [agentId, setAgentId] = useState('');
    const [displayName, setDisplayName] = useState('');

    // Comparison settings
    const [fuzzyThreshold, setFuzzyThreshold] = useState(0.8);
    const [ignoreCase, setIgnoreCase] = useState(true);
    const [ignorePunctuation, setIgnorePunctuation] = useState(true);

    const handleAddAgent = () => {
        if (!projectId || !agentId || !displayName) return;

        const newAgent: Agent = {
            id: agentId,
            displayName,
            projectId,
            location,
            defaultLanguageCode: 'en',
        };

        setAgents([...agents, newAgent]);
        setProjectId('');
        setAgentId('');
        setDisplayName('');
    };

    const handleRemoveAgent = (id: string) => {
        setAgents(agents.filter((a) => a.id !== id));
        if (selectedAgent?.id === id) {
            setSelectedAgent(null);
        }
    };

    const tabs = [
        { id: 'agents', label: 'Agent Configuration', icon: Database },
        { id: 'comparison', label: 'Comparison Settings', icon: Sliders },
        { id: 'export', label: 'Export Settings', icon: Save },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary-700">Settings</h1>
                <p className="text-dark-400 mt-1">
                    Configure your testing environment and preferences
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-700 pb-px">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
                            activeTab === tab.id
                                ? 'bg-dark-800 text-dark-50 border-b-2 border-primary-500 -mb-px'
                                : 'text-dark-400 hover:text-dark-50 hover:bg-dark-800/50'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Agent Configuration Tab */}
            {activeTab === 'agents' && (
                <div className="space-y-6">
                    {/* Add New Agent */}
                    <Card>
                        <CardHeader
                            title="Add Dialogflow CX Agent"
                            subtitle="Connect a new agent for testing"
                        />
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">
                                        Project ID
                                    </label>
                                    <input
                                        type="text"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        placeholder="my-gcp-project"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">
                                        Location
                                    </label>
                                    <select
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="input"
                                    >
                                        <option value="us-central1">us-central1</option>
                                        <option value="us-east1">us-east1</option>
                                        <option value="europe-west1">europe-west1</option>
                                        <option value="asia-northeast1">asia-northeast1</option>
                                        <option value="global">global</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">
                                        Agent ID
                                    </label>
                                    <input
                                        type="text"
                                        value={agentId}
                                        onChange={(e) => setAgentId(e.target.value)}
                                        placeholder="agent-uuid"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="My Agent"
                                        className="input"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleAddAgent}
                                    disabled={!projectId || !agentId || !displayName}
                                    leftIcon={<Plus className="w-4 h-4" />}
                                >
                                    Add Agent
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configured Agents */}
                    <Card>
                        <CardHeader
                            title="Configured Agents"
                            subtitle={`${agents.length} agent${agents.length !== 1 ? 's' : ''} configured`}
                        />
                        <CardContent>
                            {agents.length === 0 ? (
                                <div className="text-center py-8">
                                    <Database className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                    <p className="text-dark-400">No agents configured yet</p>
                                    <p className="text-sm text-dark-500">
                                        Add an agent above to start testing
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {agents.map((agent) => (
                                        <div
                                            key={agent.id}
                                            className={clsx(
                                                'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                                                selectedAgent?.id === agent.id
                                                    ? 'bg-primary-500/10 border-primary-500/30'
                                                    : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                                            )}
                                        >
                                            <div
                                                className={clsx(
                                                    'w-10 h-10 rounded-lg flex items-center justify-center',
                                                    selectedAgent?.id === agent.id
                                                        ? 'bg-primary-600'
                                                        : 'bg-dark-600'
                                                )}
                                            >
                                                <span className="text-white font-semibold">
                                                    {agent.displayName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-dark-100 font-medium">
                                                    {agent.displayName}
                                                </p>
                                                <p className="text-sm text-dark-500">
                                                    {agent.projectId} / {agent.location}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedAgent?.id !== agent.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedAgent(agent)}
                                                    >
                                                        Select
                                                    </Button>
                                                )}
                                                {selectedAgent?.id === agent.id && (
                                                    <span className="flex items-center gap-1 text-sm text-primary-400">
                                                        <Check className="w-4 h-4" /> Active
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveAgent(agent.id)}
                                                    className="p-2 rounded-lg text-dark-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Credentials */}
                    <Card>
                        <CardHeader
                            title="Google Cloud Credentials"
                            subtitle="Upload your service account key file"
                        />
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 p-4 bg-dark-700/50 border border-dashed border-dark-600 rounded-lg text-center">
                                    <Key className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                                    <p className="text-sm text-dark-400">
                                        Drop credentials.json here or click to upload
                                    </p>
                                </div>
                                <Button variant="secondary" leftIcon={<Upload className="w-4 h-4" />}>
                                    Upload
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Comparison Settings Tab */}
            {activeTab === 'comparison' && (
                <Card>
                    <CardHeader
                        title="Response Comparison Settings"
                        subtitle="Configure how test responses are compared"
                    />
                    <CardContent className="space-y-6">
                        {/* Fuzzy Match Threshold */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-dark-300">
                                    Fuzzy Match Threshold
                                </label>
                                <span className="text-sm text-primary-400 font-mono">
                                    {(fuzzyThreshold * 100).toFixed(0)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="1"
                                step="0.05"
                                value={fuzzyThreshold}
                                onChange={(e) => setFuzzyThreshold(parseFloat(e.target.value))}
                                className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                            />
                            <p className="text-xs text-dark-500 mt-2">
                                Responses with similarity above this threshold will be considered
                                matching
                            </p>
                        </div>

                        {/* Toggle Options */}
                        <div className="space-y-4 pt-4 border-t border-dark-700">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-dark-300">Ignore Case</p>
                                    <p className="text-xs text-dark-500">
                                        Compare responses case-insensitively
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIgnoreCase(!ignoreCase)}
                                    className={clsx(
                                        'w-12 h-6 rounded-full transition-colors relative',
                                        ignoreCase ? 'bg-primary-600' : 'bg-dark-600'
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                            ignoreCase ? 'translate-x-7' : 'translate-x-1'
                                        )}
                                    />
                                </button>
                            </label>

                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-dark-300">
                                        Ignore Punctuation
                                    </p>
                                    <p className="text-xs text-dark-500">
                                        Strip punctuation before comparison
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIgnorePunctuation(!ignorePunctuation)}
                                    className={clsx(
                                        'w-12 h-6 rounded-full transition-colors relative',
                                        ignorePunctuation ? 'bg-primary-600' : 'bg-dark-600'
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                            ignorePunctuation ? 'translate-x-7' : 'translate-x-1'
                                        )}
                                    />
                                </button>
                            </label>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button leftIcon={<Save className="w-4 h-4" />}>Save Settings</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Export Settings Tab */}
            {activeTab === 'export' && (
                <Card>
                    <CardHeader
                        title="Export Preferences"
                        subtitle="Configure default export formats and options"
                    />
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Default Export Format
                            </label>
                            <select className="input">
                                <option value="csv">CSV</option>
                                <option value="json">JSON</option>
                                <option value="excel">Excel (.xlsx)</option>
                            </select>
                        </div>

                        <div className="space-y-3 pt-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-dark-300">
                                    Include detailed response comparisons
                                </span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-dark-300">
                                    Include execution timestamps
                                </span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-dark-300">
                                    Include full API responses (verbose)
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button leftIcon={<Save className="w-4 h-4" />}>Save Settings</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
