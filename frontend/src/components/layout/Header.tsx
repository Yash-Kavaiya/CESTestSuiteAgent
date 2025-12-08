import { Bell, Search, ChevronDown, User } from 'lucide-react';
import { useState } from 'react';
import { useAgentStore } from '../../store/useAgentStore';

export default function Header() {
    const [searchQuery, setSearchQuery] = useState('');
    const { selectedAgent, agents } = useAgentStore();
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);
    const { setSelectedAgent } = useAgentStore();

    return (
        <header className="h-16 bg-dark-900/80 backdrop-blur-md border-b border-dark-700 flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Search */}
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                        type="text"
                        placeholder="Search test cases, results..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
                {/* Agent Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg hover:border-dark-500 transition-colors"
                    >
                        <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                        <span className="text-sm font-medium text-dark-200 max-w-[150px] truncate">
                            {selectedAgent?.displayName || 'Select Agent'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-dark-400" />
                    </button>

                    {showAgentDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden animate-fade-in z-50">
                            <div className="p-2 border-b border-dark-700">
                                <p className="text-xs text-dark-500 px-2">Available Agents</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {agents.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-dark-400">
                                        No agents configured. Go to Settings to add one.
                                    </p>
                                ) : (
                                    agents.map((agent) => (
                                        <button
                                            key={agent.id}
                                            onClick={() => {
                                                setSelectedAgent(agent);
                                                setShowAgentDropdown(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-dark-700 transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
                                                <span className="text-primary-400 font-semibold text-sm">
                                                    {agent.displayName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-dark-200 truncate">
                                                    {agent.displayName}
                                                </p>
                                                <p className="text-xs text-dark-500 truncate">
                                                    {agent.location}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-500" />
                </button>

                {/* User Menu */}
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-dark-800 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                    </div>
                </button>
            </div>
        </header>
    );
}
