import { Bell, Search, ChevronDown, User, CheckCircle, AlertCircle, Loader2, Wifi, Settings, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAgentStore, ConnectionStatus } from '../../store/useAgentStore';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
    switch (status) {
        case 'connected':
            return <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />;
        case 'testing':
            return <Loader2 className="w-3 h-3 text-warning-500 animate-spin" />;
        case 'failed':
            return <div className="w-2 h-2 rounded-full bg-danger-500" />;
        default:
            return <div className="w-2 h-2 rounded-full bg-dark-400" />;
    }
}

export default function Header() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const {
        selectedAgent,
        agents,
        setSelectedAgent,
        connectionStatus,
        connectionError,
        testConnection,
        initializeFromLocalStorage,
    } = useAgentStore();

    // Initialize store from localStorage on mount
    useEffect(() => {
        initializeFromLocalStorage();
    }, [initializeFromLocalStorage]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAgentDropdown(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTestConnection = async () => {
        if (selectedAgent) {
            await testConnection(selectedAgent);
        }
    };

    const handleSelectAgent = async (agent: typeof selectedAgent) => {
        if (agent) {
            setSelectedAgent(agent);
            setShowAgentDropdown(false);
            // Auto-test connection when selecting
            await testConnection(agent);
        }
    };

    return (
        <header className="h-16 bg-white border-b border-dark-700 shadow-soft flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Search */}
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-300" />
                    <input
                        type="text"
                        placeholder="Search test cases, results..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-full text-dark-50 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
                {/* Agent Selector */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-dark-600 rounded-full hover:bg-dark-900 hover:shadow-soft transition-all"
                    >
                        <ConnectionIndicator status={selectedAgent ? connectionStatus : 'idle'} />
                        <span className="text-sm font-medium text-dark-100 max-w-[150px] truncate">
                            {selectedAgent?.displayName || 'Select Agent'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-dark-300" />
                    </button>

                    {showAgentDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-dark-700 rounded-xl shadow-google-lg overflow-hidden animate-fade-in z-50">
                            {/* Current Agent Info */}
                            {selectedAgent && (
                                <div className="p-3 border-b border-dark-700 bg-dark-900">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-dark-300">Current Agent</span>
                                        <div className="flex items-center gap-1">
                                            {connectionStatus === 'connected' && (
                                                <span className="flex items-center gap-1 text-xs text-success-600">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Connected
                                                </span>
                                            )}
                                            {connectionStatus === 'failed' && (
                                                <span className="flex items-center gap-1 text-xs text-danger-600">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Failed
                                                </span>
                                            )}
                                            {connectionStatus === 'testing' && (
                                                <span className="flex items-center gap-1 text-xs text-warning-600">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Testing...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-dark-50">{selectedAgent.displayName}</p>
                                    <div className="mt-1 space-y-0.5">
                                        <p className="text-xs text-dark-300">
                                            <span className="text-dark-200">Project:</span> {selectedAgent.projectId}
                                        </p>
                                        <p className="text-xs text-dark-300">
                                            <span className="text-dark-200">Location:</span> {selectedAgent.location}
                                        </p>
                                        <p className="text-xs text-dark-300">
                                            <span className="text-dark-200">Agent ID:</span> {selectedAgent.id.slice(0, 12)}...
                                        </p>
                                    </div>
                                    {connectionError && (
                                        <p className="mt-2 text-xs text-danger-600 bg-danger-50 px-2 py-1 rounded">
                                            {connectionError}
                                        </p>
                                    )}
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={connectionStatus === 'testing'}
                                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {connectionStatus === 'testing' ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Wifi className="w-3 h-3" />
                                                Test Connection
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Available Agents */}
                            <div className="p-2 border-b border-dark-700">
                                <p className="text-xs text-dark-300 px-2">Available Agents</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {agents.length === 0 ? (
                                    <div className="px-4 py-6 text-center">
                                        <Settings className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                                        <p className="text-sm text-dark-300">No agents configured</p>
                                        <Link
                                            to="/settings"
                                            onClick={() => setShowAgentDropdown(false)}
                                            className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 hover:text-primary-700"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Agent in Settings
                                        </Link>
                                    </div>
                                ) : (
                                    agents.map((agent) => (
                                        <button
                                            key={agent.id}
                                            onClick={() => handleSelectAgent(agent)}
                                            className={clsx(
                                                'w-full px-4 py-3 text-left hover:bg-dark-800 transition-colors flex items-center gap-3',
                                                selectedAgent?.id === agent.id && 'bg-primary-50'
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                                <span className="text-primary-600 font-semibold text-sm">
                                                    {agent.displayName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-dark-50 truncate">
                                                    {agent.displayName}
                                                </p>
                                                <p className="text-xs text-dark-300 truncate">
                                                    {agent.projectId} / {agent.location}
                                                </p>
                                            </div>
                                            {selectedAgent?.id === agent.id && (
                                                <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 border-t border-dark-700">
                                <Link
                                    to="/settings"
                                    onClick={() => setShowAgentDropdown(false)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-dark-300 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    Manage Agents in Settings
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-full text-dark-300 hover:text-dark-50 hover:bg-dark-800 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-500" />
                </button>

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 p-1 rounded-full hover:bg-dark-800 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-soft">
                            <User className="w-5 h-5 text-white" />
                        </div>
                    </button>

                    {showUserMenu && (
                        <div
                            ref={userMenuRef}
                            className="absolute right-0 top-full mt-2 w-64 bg-white border border-dark-700 rounded-xl shadow-google-lg overflow-hidden animate-fade-in z-50"
                        >
                            <div className="p-3 border-b border-dark-700">
                                <p className="text-sm font-medium text-dark-50">Need Help?</p>
                                <p className="text-xs text-dark-300">Connect with me on social</p>
                            </div>

                            <div className="p-2 space-y-1">
                                <a
                                    href="https://github.com/Yash-Kavaiya"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-dark-200 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                    </svg>
                                    GitHub
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/yashkavaiya/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-dark-200 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    LinkedIn
                                </a>
                                <a
                                    href="https://x.com/Yash_Kavaiya_"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-dark-200 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    X (Twitter)
                                </a>
                                <a
                                    href="https://www.youtube.com/@genai-guru"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-dark-200 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                    YouTube
                                </a>
                                <a
                                    href="mailto:yash.kavaiya3@gmail.com"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-dark-200 hover:text-dark-50 hover:bg-dark-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email
                                </a>
                            </div>

                            <div className="p-2 border-t border-dark-700">
                                <p className="px-3 py-2 text-xs text-dark-300">
                                    Built by <span className="text-primary-600">Yash Kavaiya</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}


