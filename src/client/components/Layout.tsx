import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../lib/store.js';
import { useSocket } from '../lib/socket.js';
import {
    LayoutDashboard, FolderGit2, Puzzle, FileText, Bot, Bug, X
} from 'lucide-react';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/repo', label: 'Repo Setup', icon: FolderGit2 },
    { to: '/skills', label: 'Skills', icon: Puzzle },
    { to: '/specs', label: 'Specifications', icon: FileText },
    { to: '/engineer', label: 'AI Engineer', icon: Bot },
    { to: '/bugs', label: 'Bug Tracker', icon: Bug },
];

export default function Layout({ children }: { children: ReactNode }) {
    const { toasts, removeToast, repoPath, profile } = useApp();
    const { connected } = useSocket();
    const location = useLocation();

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-1 border-r border-surface-3 flex flex-col shrink-0">
                {/* Logo */}
                <div className="p-4 border-b border-surface-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-sm">
                            AE
                        </div>
                        <div>
                            <h1 className="font-semibold text-gray-100 text-sm">Agent Ecosystem</h1>
                            <p className="text-xs text-gray-500">v0.2.0</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${isActive
                                    ? 'bg-accent/15 text-accent-hover font-medium'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
                                }`
                            }
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Status footer */}
                <div className="p-3 border-t border-surface-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success pulse-dot' : 'bg-danger'}`} />
                        <span className="text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                    {repoPath && (
                        <div className="text-gray-500 truncate" title={repoPath}>
                            {profile?.name ?? repoPath.split(/[/\\]/).pop()}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-6">
                    {children}
                </div>
            </main>

            {/* Toast notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm animate-[slideIn_0.3s_ease-out] ${toast.type === 'error' ? 'bg-danger/10 border-danger/30 text-danger' :
                                toast.type === 'success' ? 'bg-success/10 border-success/30 text-success' :
                                    toast.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' :
                                        'bg-accent/10 border-accent/30 text-accent-hover'
                            }`}
                    >
                        <span className="flex-1">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
