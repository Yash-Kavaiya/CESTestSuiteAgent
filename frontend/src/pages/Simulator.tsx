import { useState, useRef, useEffect } from 'react';
import {
    Send,
    RefreshCw,
    Bot,
    User,
    Sparkles,
    ExternalLink,
    Settings,
    Check,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import clsx from 'clsx';

interface Message {
    id: string;
    role: 'user' | 'agent';
    text: string;
    intent?: string;
    page?: string;
    confidence?: number;
    sentiment?: { score: number; magnitude: number };
    parameters?: Record<string, unknown>;
    timestamp: Date;
    isError?: boolean;
}

interface AgentConfig {
    projectId: string;
    location: string;
    agentId: string;
}

export default function Simulator() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
    const [currentPage, setCurrentPage] = useState('Start Page');
    const [showConfig, setShowConfig] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [agentConfig, setAgentConfig] = useState<AgentConfig>({
        projectId: '',
        location: 'global',
        agentId: '',
    });
    const [tempConfig, setTempConfig] = useState<AgentConfig>({
        projectId: '',
        location: 'global',
        agentId: '',
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load saved config from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('dialogflow-agent-config');
        if (saved) {
            const config = JSON.parse(saved);
            setAgentConfig(config);
            setTempConfig(config);
            setIsConnected(true);
        } else {
            setShowConfig(true);
        }
    }, []);

    const saveConfig = () => {
        if (tempConfig.projectId && tempConfig.agentId) {
            setAgentConfig(tempConfig);
            localStorage.setItem('dialogflow-agent-config', JSON.stringify(tempConfig));
            setIsConnected(true);
            setShowConfig(false);
            resetSession();
            // Add system message confirming connection
            setMessages(prev => [...prev, {
                id: `sys-${Date.now()}`,
                role: 'agent',
                text: `Connected to agent ${tempConfig.projectId}. precise location: ${tempConfig.location}`,
                timestamp: new Date(),
            }]);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            text: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/v1/simulator/detect-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: agentConfig.projectId,
                    location: agentConfig.location,
                    agentId: agentConfig.agentId,
                    sessionId,
                    text: input,
                }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const agentMessage: Message = {
                    id: `msg-${Date.now() + 1}`,
                    role: 'agent',
                    text: data.data.responseText || 'No response',
                    intent: data.data.intentDisplayName,
                    page: data.data.currentPage,
                    confidence: data.data.confidence,
                    sentiment: data.data.sentiment,
                    parameters: data.data.parameters,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, agentMessage]);
                if (data.data.currentPage) {
                    setCurrentPage(data.data.currentPage);
                }
            } else {
                throw new Error(data.error || 'Failed to get response form server');
            }
        } catch (error: any) {
            // Show error as agent message
            console.error("Simulator error:", error);
            const errorMessage: Message = {
                id: `msg-${Date.now() + 1}`,
                role: 'agent',
                text: error.message || (isConnected
                    ? 'Unable to connect to the agent. Check backend logs or configuration.'
                    : 'Please configure your agent first.'),
                timestamp: new Date(),
                isError: true,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const resetSession = () => {
        setMessages([]);
        setSessionId(`session-${Date.now()}`);
        setCurrentPage('Start Page');
    };

    const consoleUrl = agentConfig.projectId && agentConfig.agentId
        ? `https://conversational-agents.cloud.google.com/projects/${agentConfig.projectId}/locations/${agentConfig.location}/agents/${agentConfig.agentId}`
        : null;

    return (
        <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader
                        title="Agent Simulator"
                        subtitle={isConnected ? `Session: ${sessionId.slice(0, 16)}... • Page: ${currentPage}` : 'Configure your agent to start testing'}
                        action={
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={resetSession} title="Reset Session">
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={showConfig ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setShowConfig(!showConfig)}
                                    title="Agent Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                                {consoleUrl && (
                                    <a
                                        href={consoleUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                                    >
                                        Open Console
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        }
                    />

                    {/* Messages */}
                    <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Sparkles className="w-12 h-12 text-primary-500 mb-4" />
                                <h3 className="text-lg font-medium text-dark-200">
                                    {isConnected ? 'Start a Conversation' : 'Connect Your Agent'}
                                </h3>
                                <p className="text-sm text-dark-500 mt-2 max-w-md">
                                    {isConnected
                                        ? 'Type a message below to test your Dialogflow CX agent in real-time.'
                                        : 'Click the Settings button to configure your Dialogflow CX agent and start testing.'}
                                </p>
                                {!isConnected && (
                                    <Button className="mt-4" onClick={() => setShowConfig(true)}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Configure Agent
                                    </Button>
                                )}
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={clsx(
                                    'flex gap-3',
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                {msg.role === 'agent' && (
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                        msg.isError ? "bg-danger-500" : "bg-primary-600"
                                    )}>
                                        {msg.isError ? <AlertCircle className="w-4 h-4 text-dark-50" /> : <Bot className="w-4 h-4 text-dark-50" />}
                                    </div>
                                )}

                                <div
                                    className={clsx(
                                        'max-w-[70%] rounded-2xl p-4',
                                        msg.role === 'user'
                                            ? 'bg-primary-600 text-white rounded-br-md'
                                            : (msg.isError ? 'bg-danger-500/10 text-danger-200 border border-danger-500/20' : 'bg-dark-700 text-dark-200') + ' rounded-bl-md'
                                    )}
                                >
                                    <p className="text-sm">{msg.text}</p>
                                    {msg.role === 'agent' && !msg.isError && (msg.intent || msg.page || msg.confidence) && (
                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-dark-600">
                                            {msg.intent && (
                                                <span className="text-xs px-2 py-0.5 bg-dark-600 rounded-full text-primary-400">
                                                    {msg.intent}
                                                </span>
                                            )}
                                            {msg.page && (
                                                <span className="text-xs px-2 py-0.5 bg-dark-600 rounded-full text-purple-400">
                                                    {msg.page}
                                                </span>
                                            )}
                                            {msg.confidence && (
                                                <span className="text-xs px-2 py-0.5 bg-dark-600 rounded-full text-green-400">
                                                    {(msg.confidence * 100).toFixed(0)}% confidence
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-dark-300" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-dark-50" />
                                </div>
                                <div className="bg-dark-700 rounded-2xl rounded-bl-md p-4">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <span className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </CardContent>

                    {/* Input */}
                    <div className="p-4 border-t border-dark-700">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendMessage();
                            }}
                            className="flex gap-3"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isConnected ? 'Type your message...' : 'Configure agent first...'}
                                className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                                disabled={isLoading || !isConnected}
                            />
                            <Button type="submit" disabled={!input.trim() || isLoading || !isConnected}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>

            {/* Sidebar */}
            <div className="w-80 flex flex-col gap-4">
                {/* Agent Configuration */}
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-dark-200">
                            {isConnected ? 'Connected Agent' : 'Select Agent'}
                        </h3>
                        {isConnected && (
                            <span className="flex items-center gap-1 text-xs text-success-400">
                                <Check className="w-3 h-3" />
                                Connected
                            </span>
                        )}
                    </div>

                    {showConfig || !isConnected ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-dark-500 block mb-1">Project ID</label>
                                <input
                                    type="text"
                                    value={tempConfig.projectId}
                                    onChange={(e) => setTempConfig({ ...tempConfig, projectId: e.target.value })}
                                    placeholder="your-project-id"
                                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-dark-500 block mb-1">Location</label>
                                <select
                                    value={tempConfig.location}
                                    onChange={(e) => setTempConfig({ ...tempConfig, location: e.target.value })}
                                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:border-primary-500"
                                >
                                    <option value="global">global</option>
                                    <option value="us-central1">us-central1</option>
                                    <option value="us-east1">us-east1</option>
                                    <option value="europe-west1">europe-west1</option>
                                    <option value="asia-northeast1">asia-northeast1</option>
                                    <option value="australia-southeast1">australia-southeast1</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-dark-500 block mb-1">Agent ID</label>
                                <input
                                    type="text"
                                    value={tempConfig.agentId}
                                    onChange={(e) => setTempConfig({ ...tempConfig, agentId: e.target.value })}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <Button onClick={saveConfig} className="w-full" disabled={!tempConfig.projectId || !tempConfig.agentId}>
                                {isConnected ? 'Update Configuration' : 'Connect Agent'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-dark-500">Project</span>
                                <span className="text-dark-300 font-mono truncate max-w-[140px]">{agentConfig.projectId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-500">Location</span>
                                <span className="text-dark-300">{agentConfig.location}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-500">Agent ID</span>
                                <span className="text-dark-300 font-mono truncate max-w-[140px]">
                                    {agentConfig.agentId.slice(0, 8)}...
                                </span>
                            </div>
                            <button
                                onClick={() => setShowConfig(true)}
                                className="w-full mt-2 px-3 py-1.5 text-xs text-dark-400 hover:text-dark-50 hover:bg-dark-700 rounded-lg transition-colors"
                            >
                                Change Agent
                            </button>
                        </div>
                    )}
                </Card>

                {/* Quick Test Phrases */}
                {isConnected && (
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-dark-200 mb-3">Quick Test Phrases</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Hello', 'Help', 'Book a flight', 'Check order', 'Goodbye'].map((phrase) => (
                                <button
                                    key={phrase}
                                    onClick={() => setInput(phrase)}
                                    className="px-3 py-1.5 text-xs bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-full transition-colors"
                                >
                                    {phrase}
                                </button>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Session Info */}
                {isConnected && (
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-dark-200 mb-3">Session Info</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-dark-500">Session ID</span>
                                <span className="text-dark-400 font-mono truncate max-w-[140px]">{sessionId.slice(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-500">Current Page</span>
                                <span className="text-dark-300">{currentPage}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-500">Messages</span>
                                <span className="text-dark-300">{messages.filter(m => !m.isError).length}</span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
