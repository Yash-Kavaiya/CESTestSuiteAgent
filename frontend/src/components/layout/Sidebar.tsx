import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileSpreadsheet,
    ListChecks,
    PieChart,
    History,
    Settings,
    ChevronLeft,
    Bot,
    MessageSquare,
    Globe,
    Brain,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Simulator', href: '/simulator', icon: MessageSquare },
    { name: 'Agent URL Test', href: '/agent-url-test', icon: Globe },
    { name: 'Bulk Test', href: '/bulk-test', icon: FileSpreadsheet },
    { name: 'Results', href: '/results', icon: ListChecks },
    { name: 'Coverage', href: '/coverage', icon: PieChart },
    { name: 'History', href: '/history', icon: History },
    { name: 'AI Analysis', href: '/ai-analysis', icon: Brain },
    { name: 'Responsible AI', href: '/responsible-ai', icon: ShieldAlert },
];

const bottomNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={clsx(
                'fixed left-0 top-0 h-screen bg-white border-r border-dark-700 flex flex-col transition-all duration-300 z-50',
                collapsed ? 'w-20' : 'w-[280px]'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-google">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="animate-fade-in">
                            <h1 className="text-lg font-bold text-dark-50">CX Tester</h1>
                            <p className="text-xs text-dark-300">Dialogflow Testing</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={clsx(
                        'p-2 rounded-full text-dark-300 hover:text-dark-50 hover:bg-dark-800 transition-all',
                        collapsed && 'rotate-180'
                    )}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-200 group',
                                isActive
                                    ? 'bg-primary-50 text-primary-600 font-medium'
                                    : 'text-dark-200 hover:text-dark-50 hover:bg-dark-800'
                            )
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                            <span className="animate-fade-in">{item.name}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Navigation */}
            <div className="py-4 px-3 border-t border-dark-700">
                {bottomNav.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-200',
                                isActive
                                    ? 'bg-primary-50 text-primary-600 font-medium'
                                    : 'text-dark-200 hover:text-dark-50 hover:bg-dark-800'
                            )
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                            <span className="animate-fade-in">{item.name}</span>
                        )}
                    </NavLink>
                ))}
            </div>
        </aside>
    );
}

