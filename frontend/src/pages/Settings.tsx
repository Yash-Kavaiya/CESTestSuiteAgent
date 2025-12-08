import { useState, useEffect, useRef } from 'react';
import {
    Key,
    Database,
    Sliders,
    Save,
    Trash2,
    Plus,
    Check,
    Wifi,
    Loader2,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAgentStore } from '../store/useAgentStore';
import { testAgentConnection } from '../api/agents';
import { Agent } from '../types';
import clsx from 'clsx';
import axios from 'axios';

type AgentConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

interface CredentialsInfo {
    projectId: string;
    clientEmail: string;
}

export default function Settings() {
    const { agents, addAgent, removeAgent, selectedAgent, setSelectedAgent, initializeFromLocalStorage } = useAgentStore();
    const [activeTab, setActiveTab] = useState<'agents' | 'comparison' | 'export'>(
        'agents'
    );

    // Connection status per agent
    const [agentConnectionStatus, setAgentConnectionStatus] = useState<Record<string, AgentConnectionStatus>>({});
    const [agentConnectionError, setAgentConnectionError] = useState<Record<string, string>>({});

    // Credentials state
    const [credentialsInfo, setCredentialsInfo] = useState<CredentialsInfo | null>(null);
    const [credentialsLoading, setCredentialsLoading] = useState(false);
    const [credentialsError, setCredentialsError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [projectId, setProjectId] = useState('');
    const [location, setLocation] = useState('us-central1');
    const [agentId, setAgentId] = useState('');
    const [displayName, setDisplayName] = useState('');

    // Comparison settings
    const [fuzzyThreshold, setFuzzyThreshold] = useState(0.8);
    const [ignoreCase, setIgnoreCase] = useState(true);
    const [ignorePunctuation, setIgnorePunctuation] = useState(true);

    // Initialize store on mount
    useEffect(() => {
        initializeFromLocalStorage();
    }, [initializeFromLocalStorage]);

    // Load credentials status on mount
    useEffect(() => {
        loadCredentialsStatus();
    }, []);

    const loadCredentialsStatus = async () => {
        try {
            const response = await axios.get('/api/v1/settings/credentials');
            if (response.data.success && response.data.data.configured) {
                setCredentialsInfo({
                    projectId: response.data.data.projectId,
                    clientEmail: response.data.data.clientEmail,
                });
            }
        } catch (error) {
            console.error('Failed to load credentials status:', error);
        }
    };

    const uploadCredentials = async (file: File) => {
        setCredentialsLoading(true);
        setCredentialsError(null);

        try {
            const formData = new FormData();
            formData.append('credentials', file);

            const response = await axios.post('/api/v1/settings/credentials', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setCredentialsInfo({
                    projectId: response.data.data.projectId,
                    clientEmail: response.data.data.clientEmail,
                });
            } else {
                setCredentialsError(response.data.error || 'Upload failed');
            }
        } catch (error: any) {
            setCredentialsError(error.response?.data?.error || error.message || 'Upload failed');
        } finally {
            setCredentialsLoading(false);
        }
    };

    const handleRemoveCredentials = async () => {
        setCredentialsLoading(true);
        try {
            await axios.delete('/api/v1/settings/credentials');
            setCredentialsInfo(null);
        } catch (error: any) {
            setCredentialsError(error.response?.data?.error || 'Failed to remove credentials');
        } finally {
            setCredentialsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadCredentials(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
            uploadCredentials(file);
        } else {
            setCredentialsError('Please upload a JSON file');
        }
    };


    const handleAddAgent = () => {
        if (!projectId || !agentId || !displayName) return;

        const newAgent: Agent = {
            id: agentId,
            displayName,
            projectId,
            location,
            defaultLanguageCode: 'en',
        };

        addAgent(newAgent);
        setProjectId('');
        setAgentId('');
        setDisplayName('');
    };

    const handleRemoveAgent = (id: string) => {
        removeAgent(id);
        // Clean up connection status
        setAgentConnectionStatus(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setAgentConnectionError(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleTestConnection = async (agent: Agent) => {
        setAgentConnectionStatus(prev => ({ ...prev, [agent.id]: 'testing' }));
        setAgentConnectionError(prev => {
            const next = { ...prev };
            delete next[agent.id];
            return next;
        });

        const result = await testAgentConnection(agent);

        if (result.success && result.connected) {
            setAgentConnectionStatus(prev => ({ ...prev, [agent.id]: 'connected' }));
        } else {
            setAgentConnectionStatus(prev => ({ ...prev, [agent.id]: 'failed' }));
            setAgentConnectionError(prev => ({ ...prev, [agent.id]: result.error || 'Connection failed' }));
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
                                    {agents.map((agent) => {
                                        const status = agentConnectionStatus[agent.id] || 'idle';
                                        const error = agentConnectionError[agent.id];

                                        return (
                                            <div
                                                key={agent.id}
                                                className={clsx(
                                                    'p-4 rounded-lg border transition-colors',
                                                    selectedAgent?.id === agent.id
                                                        ? 'bg-primary-500/10 border-primary-500/30'
                                                        : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
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
                                                        {/* Connection Status */}
                                                        {status === 'connected' && (
                                                            <span className="flex items-center gap-1 text-xs text-success-400 bg-success-500/10 px-2 py-1 rounded">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Connected
                                                            </span>
                                                        )}
                                                        {status === 'failed' && (
                                                            <span className="flex items-center gap-1 text-xs text-danger-400 bg-danger-500/10 px-2 py-1 rounded">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Failed
                                                            </span>
                                                        )}

                                                        {/* Test Connection Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleTestConnection(agent)}
                                                            disabled={status === 'testing'}
                                                        >
                                                            {status === 'testing' ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Wifi className="w-4 h-4" />
                                                            )}
                                                        </Button>

                                                        {/* Select Button */}
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

                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={() => handleRemoveAgent(agent.id)}
                                                            className="p-2 rounded-lg text-dark-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Connection Error */}
                                                {error && (
                                                    <p className="mt-2 text-xs text-danger-400 bg-danger-500/10 px-3 py-1.5 rounded">
                                                        {error}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
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
                            {credentialsInfo ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-success-500/10 border border-success-500/30 rounded-lg">
                                        <div className="w-12 h-12 rounded-lg bg-success-500/20 flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6 text-success-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-dark-200">Credentials Configured</p>
                                            <p className="text-xs text-dark-400 mt-1">
                                                Project: <span className="font-mono text-dark-300">{credentialsInfo.projectId}</span>
                                            </p>
                                            <p className="text-xs text-dark-400">
                                                Email: <span className="font-mono text-dark-300">{credentialsInfo.clientEmail}</span>
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveCredentials}
                                            disabled={credentialsLoading}
                                            className="text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-dark-500">
                                        To use different credentials, remove the current ones and upload a new file.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div
                                        className={clsx(
                                            'relative p-6 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer',
                                            isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 hover:border-dark-500'
                                        )}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json,application/json"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        {credentialsLoading ? (
                                            <>
                                                <Loader2 className="w-10 h-10 text-primary-500 mx-auto mb-3 animate-spin" />
                                                <p className="text-sm text-dark-300">Uploading credentials...</p>
                                            </>
                                        ) : (
                                            <>
                                                <Key className="w-10 h-10 text-dark-500 mx-auto mb-3" />
                                                <p className="text-sm text-dark-300">
                                                    Drop your <span className="font-mono text-primary-400">credentials.json</span> here
                                                </p>
                                                <p className="text-xs text-dark-500 mt-1">
                                                    or click to browse
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {credentialsError && (
                                        <div className="flex items-center gap-2 p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg">
                                            <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
                                            <p className="text-xs text-danger-300">{credentialsError}</p>
                                        </div>
                                    )}
                                    <p className="text-xs text-dark-500">
                                        Download a service account key from{' '}
                                        <a
                                            href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-400 hover:text-primary-300 underline"
                                        >
                                            Google Cloud Console
                                        </a>
                                    </p>
                                </div>
                            )}
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
