import { useState, useEffect } from 'react';
import {
    Globe,
    Play,
    Plus,
    Trash2,
    Settings,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    ExternalLink,
    Camera,
    MousePointer,
    Type,
    Eye,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Save,
    FolderOpen,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import clsx from 'clsx';

interface TestStep {
    id: string;
    action: 'navigate' | 'click' | 'type' | 'screenshot' | 'wait' | 'assert';
    selector?: string;
    value?: string;
    timeout?: number;
    description: string;
}

interface TestConfig {
    id: string;
    name: string;
    url: string;
    testSteps: TestStep[];
    createdAt: string;
    updatedAt: string;
}

interface TestResult {
    id: string;
    configId: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    steps: StepResult[];
    screenshots: string[];
    startedAt: string;
    completedAt?: string;
    error?: string;
}

interface StepResult {
    stepId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    screenshot?: string;
    error?: string;
}

const ACTION_ICONS = {
    navigate: Globe,
    click: MousePointer,
    type: Type,
    screenshot: Camera,
    wait: Clock,
    assert: Eye,
};

const ACTION_LABELS = {
    navigate: 'Navigate',
    click: 'Click',
    type: 'Type',
    screenshot: 'Screenshot',
    wait: 'Wait',
    assert: 'Assert',
};

export default function AgentUrlTest() {
    const [url, setUrl] = useState('');
    const [configName, setConfigName] = useState('');
    const [testSteps, setTestSteps] = useState<TestStep[]>([]);
    const [savedConfigs, setSavedConfigs] = useState<TestConfig[]>([]);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [currentTestId, setCurrentTestId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showStepBuilder, setShowStepBuilder] = useState(false);
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

    // New step form state
    const [newStep, setNewStep] = useState<Partial<TestStep>>({
        action: 'click',
        description: '',
    });

    // Fetch saved configurations
    useEffect(() => {
        fetchConfigs();
        fetchResults();
    }, []);

    // Poll for test status when running
    useEffect(() => {
        if (!currentTestId || !isRunning) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/v1/agent-url-test/status/${currentTestId}`);
                const data = await response.json();

                if (data.success && data.data) {
                    if (data.data.status === 'passed' || data.data.status === 'failed') {
                        setIsRunning(false);
                        fetchResults();
                    }
                }
            } catch (error) {
                console.error('Error polling test status:', error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentTestId, isRunning]);

    const fetchConfigs = async () => {
        try {
            const response = await fetch('/api/v1/agent-url-test/configs');
            const data = await response.json();
            if (data.success) {
                setSavedConfigs(data.data);
            }
        } catch (error) {
            console.error('Error fetching configs:', error);
        }
    };

    const fetchResults = async () => {
        try {
            const response = await fetch('/api/v1/agent-url-test/results?limit=20');
            const data = await response.json();
            if (data.success) {
                setTestResults(data.data);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
        }
    };

    const handleQuickTest = async () => {
        if (!url.trim()) return;

        setIsRunning(true);
        try {
            const response = await fetch('/api/v1/agent-url-test/quick-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
                    testSteps: testSteps.length > 0 ? testSteps : undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setCurrentTestId(data.data.testId);
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error('Error running quick test:', error);
            setIsRunning(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!url.trim() || !configName.trim()) return;

        try {
            const response = await fetch('/api/v1/agent-url-test/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: configName.trim(),
                    url: url.trim(),
                    testSteps,
                }),
            });

            const data = await response.json();
            if (data.success) {
                fetchConfigs();
                setConfigName('');
            }
        } catch (error) {
            console.error('Error saving config:', error);
        }
    };

    const handleLoadConfig = (config: TestConfig) => {
        setUrl(config.url);
        setConfigName(config.name);
        setTestSteps(config.testSteps);
        setSelectedConfigId(config.id);
    };

    const handleDeleteConfig = async (configId: string) => {
        try {
            await fetch(`/api/v1/agent-url-test/configs/${configId}`, {
                method: 'DELETE',
            });
            fetchConfigs();
            if (selectedConfigId === configId) {
                setSelectedConfigId(null);
            }
        } catch (error) {
            console.error('Error deleting config:', error);
        }
    };

    const handleRunSavedConfig = async (configId: string) => {
        setIsRunning(true);
        try {
            const response = await fetch(`/api/v1/agent-url-test/run/${configId}`, {
                method: 'POST',
            });

            const data = await response.json();
            if (data.success) {
                setCurrentTestId(data.data.testId);
            }
        } catch (error) {
            console.error('Error running saved config:', error);
            setIsRunning(false);
        }
    };

    const addStep = () => {
        if (!newStep.action || !newStep.description) return;

        const step: TestStep = {
            id: `step-${Date.now()}`,
            action: newStep.action as TestStep['action'],
            selector: newStep.selector,
            value: newStep.value,
            timeout: newStep.timeout,
            description: newStep.description,
        };

        setTestSteps([...testSteps, step]);
        setNewStep({ action: 'click', description: '' });
    };

    const removeStep = (stepId: string) => {
        setTestSteps(testSteps.filter((s) => s.id !== stepId));
    };

    const toggleResultExpanded = (resultId: string) => {
        setExpandedResults((prev) => {
            const next = new Set(prev);
            if (next.has(resultId)) {
                next.delete(resultId);
            } else {
                next.add(resultId);
            }
            return next;
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'passed':
                return <CheckCircle className="w-4 h-4 text-success-400" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-danger-400" />;
            case 'running':
                return <RefreshCw className="w-4 h-4 text-primary-400 animate-spin" />;
            default:
                return <Clock className="w-4 h-4 text-dark-400" />;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark-50">Agent URL Testing</h1>
                    <p className="text-dark-400 mt-1">
                        Test web-based agents using browser automation (Google ADK Computer Use)
                    </p>
                </div>
                <a
                    href="https://google.github.io/adk-docs/tools/gemini-api/computer-use/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
                >
                    ADK Docs
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Test Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* URL Input */}
                    <Card>
                        <CardHeader
                            title="Test Configuration"
                            subtitle="Enter the URL of your web agent to test"
                        />
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm text-dark-400 mb-1">Agent URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://your-agent-url.com"
                                            className="w-full pl-10 pr-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={handleQuickTest}
                                        disabled={!url.trim() || isRunning}
                                        className="h-[42px]"
                                    >
                                        {isRunning ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                        <span className="ml-2">{isRunning ? 'Running...' : 'Quick Test'}</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Save Configuration */}
                            <div className="flex gap-3 pt-2 border-t border-dark-700">
                                <input
                                    type="text"
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="Configuration name..."
                                    className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={handleSaveConfig}
                                    disabled={!url.trim() || !configName.trim()}
                                >
                                    <Save className="w-4 h-4" />
                                    <span className="ml-2">Save</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Steps Builder */}
                    <Card>
                        <CardHeader
                            title="Test Steps"
                            subtitle="Define actions to perform on the agent"
                            action={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowStepBuilder(!showStepBuilder)}
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="ml-1">Add Step</span>
                                </Button>
                            }
                        />
                        <CardContent>
                            {/* Step Builder Form */}
                            {showStepBuilder && (
                                <div className="mb-4 p-4 bg-dark-750 rounded-lg border border-dark-600">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs text-dark-400 mb-1">Action</label>
                                            <select
                                                value={newStep.action}
                                                onChange={(e) =>
                                                    setNewStep({ ...newStep, action: e.target.value as TestStep['action'] })
                                                }
                                                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="click">Click</option>
                                                <option value="type">Type</option>
                                                <option value="navigate">Navigate</option>
                                                <option value="screenshot">Screenshot</option>
                                                <option value="wait">Wait</option>
                                                <option value="assert">Assert</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-dark-400 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={newStep.description}
                                                onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                                                placeholder="Step description..."
                                                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs text-dark-400 mb-1">Selector (optional)</label>
                                            <input
                                                type="text"
                                                value={newStep.selector || ''}
                                                onChange={(e) => setNewStep({ ...newStep, selector: e.target.value })}
                                                placeholder="#button, .class, [data-test]"
                                                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-dark-400 mb-1">Value (optional)</label>
                                            <input
                                                type="text"
                                                value={newStep.value || ''}
                                                onChange={(e) => setNewStep({ ...newStep, value: e.target.value })}
                                                placeholder="Text to type or URL"
                                                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setShowStepBuilder(false)}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={addStep} disabled={!newStep.description}>
                                            Add Step
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Steps List */}
                            {testSteps.length === 0 ? (
                                <div className="text-center py-8 text-dark-500">
                                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No test steps defined</p>
                                    <p className="text-xs mt-1">Add steps to create a test sequence</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {testSteps.map((step, index) => {
                                        const Icon = ACTION_ICONS[step.action];
                                        return (
                                            <div
                                                key={step.id}
                                                className="flex items-center gap-3 p-3 bg-dark-750 rounded-lg border border-dark-600"
                                            >
                                                <span className="w-6 h-6 flex items-center justify-center bg-dark-600 rounded-full text-xs text-dark-300">
                                                    {index + 1}
                                                </span>
                                                <Icon className="w-4 h-4 text-primary-400" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-dark-200">{step.description}</p>
                                                    <p className="text-xs text-dark-500">
                                                        {ACTION_LABELS[step.action]}
                                                        {step.selector && ` • ${step.selector}`}
                                                        {step.value && ` • "${step.value}"`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeStep(step.id)}
                                                    className="p-1 text-dark-500 hover:text-danger-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Test Results */}
                    <Card>
                        <CardHeader
                            title="Recent Results"
                            subtitle="View test execution history"
                            action={
                                <Button variant="ghost" size="sm" onClick={fetchResults}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            }
                        />
                        <CardContent>
                            {testResults.length === 0 ? (
                                <div className="text-center py-8 text-dark-500">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No test results yet</p>
                                    <p className="text-xs mt-1">Run a test to see results here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {testResults.map((result) => (
                                        <div
                                            key={result.id}
                                            className="border border-dark-600 rounded-lg overflow-hidden"
                                        >
                                            <button
                                                onClick={() => toggleResultExpanded(result.id)}
                                                className="w-full flex items-center justify-between p-3 bg-dark-750 hover:bg-dark-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(result.status)}
                                                    <div className="text-left">
                                                        <p className="text-sm text-dark-200">
                                                            Test {result.id.slice(0, 8)}
                                                        </p>
                                                        <p className="text-xs text-dark-500">
                                                            {new Date(result.startedAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={clsx(
                                                            'px-2 py-0.5 text-xs rounded-full',
                                                            result.status === 'passed' && 'bg-success-500/20 text-success-400',
                                                            result.status === 'failed' && 'bg-danger-500/20 text-danger-400',
                                                            result.status === 'running' && 'bg-primary-500/20 text-primary-400',
                                                            result.status === 'pending' && 'bg-dark-600 text-dark-400'
                                                        )}
                                                    >
                                                        {result.status}
                                                    </span>
                                                    {expandedResults.has(result.id) ? (
                                                        <ChevronDown className="w-4 h-4 text-dark-400" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-dark-400" />
                                                    )}
                                                </div>
                                            </button>
                                            {expandedResults.has(result.id) && (
                                                <div className="p-3 bg-dark-800 border-t border-dark-600">
                                                    {result.steps.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {result.steps.map((step, idx) => (
                                                                <div
                                                                    key={step.stepId}
                                                                    className="flex items-center gap-2 text-xs"
                                                                >
                                                                    {step.status === 'passed' ? (
                                                                        <CheckCircle className="w-3 h-3 text-success-400" />
                                                                    ) : (
                                                                        <XCircle className="w-3 h-3 text-danger-400" />
                                                                    )}
                                                                    <span className="text-dark-400">Step {idx + 1}</span>
                                                                    <span className="text-dark-500">
                                                                        {step.duration.toFixed(0)}ms
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-dark-500">No step details available</p>
                                                    )}
                                                    {result.error && (
                                                        <p className="mt-2 text-xs text-danger-400">{result.error}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Saved Configurations */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader
                            title="Saved Configurations"
                            subtitle="Load and run saved tests"
                        />
                        <CardContent>
                            {savedConfigs.length === 0 ? (
                                <div className="text-center py-6 text-dark-500">
                                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No saved configurations</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {savedConfigs.map((config) => (
                                        <div
                                            key={config.id}
                                            className={clsx(
                                                'p-3 rounded-lg border transition-colors cursor-pointer',
                                                selectedConfigId === config.id
                                                    ? 'bg-primary-500/10 border-primary-500/30'
                                                    : 'bg-dark-750 border-dark-600 hover:border-dark-500'
                                            )}
                                            onClick={() => handleLoadConfig(config)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-dark-200 truncate">
                                                        {config.name}
                                                    </p>
                                                    <p className="text-xs text-dark-500 truncate mt-0.5">
                                                        {config.url}
                                                    </p>
                                                    <p className="text-xs text-dark-600 mt-1">
                                                        {config.testSteps.length} steps
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRunSavedConfig(config.id);
                                                        }}
                                                        disabled={isRunning}
                                                        className="p-1.5 text-primary-400 hover:bg-dark-600 rounded transition-colors disabled:opacity-50"
                                                        title="Run test"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteConfig(config.id);
                                                        }}
                                                        className="p-1.5 text-dark-500 hover:text-danger-400 hover:bg-dark-600 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card className="bg-gradient-to-br from-primary-900/20 to-dark-800">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-medium text-dark-200 mb-2">
                                About Agent URL Testing
                            </h3>
                            <p className="text-xs text-dark-400 mb-3">
                                This feature uses Google ADK Computer Use with Playwright to automate browser
                                interactions for testing web-based agents.
                            </p>
                            <div className="space-y-2 text-xs text-dark-500">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-3 h-3" />
                                    <span>Navigate to any URL</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MousePointer className="w-3 h-3" />
                                    <span>Click elements by selector</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Type className="w-3 h-3" />
                                    <span>Type text into inputs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Camera className="w-3 h-3" />
                                    <span>Capture screenshots</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
