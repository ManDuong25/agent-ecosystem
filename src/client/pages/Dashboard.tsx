import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/store.js';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';
import {
    FolderGit2, Puzzle, FileText, Bot, Bug, Zap,
    Activity, ArrowRight
} from 'lucide-react';
import type { Spec, Skill, FileChange } from '../../shared/types.js';

export default function Dashboard() {
    const { repoPath, profile } = useApp();
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [changes, setChanges] = useState<FileChange[]>([]);
    const [aiHealth, setAiHealth] = useState<boolean | null>(null);

    useEffect(() => {
        if (repoPath) {
            api.specs.list(repoPath).then(setSpecs).catch(() => { });
            api.repo.getChanges(repoPath).then(setChanges).catch(() => { });
        }
        api.skills.list().then(setSkills).catch(() => { });
        api.ai.health().then(h => setAiHealth(h.reachable)).catch(() => setAiHealth(false));
    }, [repoPath]);

    const tasksDone = specs.flatMap(s => s.tasks).filter(t => t.status === 'done').length;
    const tasksTotal = specs.flatMap(s => s.tasks).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Overview of your agent development ecosystem</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<FolderGit2 size={20} />}
                    label="Repository"
                    value={profile?.name ?? 'Not configured'}
                    sub={profile ? `${profile.totalFiles} files • ${profile.frameworks.join(', ')}` : 'Go to Repo Setup'}
                    color="accent"
                    to="/repo"
                />
                <StatCard
                    icon={<Puzzle size={20} />}
                    label="Skills"
                    value={`${skills.length} sources`}
                    sub={`${skills.reduce((s, sk) => s + sk.skillCount, 0)} skills total`}
                    color="success"
                    to="/skills"
                />
                <StatCard
                    icon={<FileText size={20} />}
                    label="Specifications"
                    value={`${specs.length} specs`}
                    sub={tasksTotal > 0 ? `${tasksDone}/${tasksTotal} tasks done` : 'No tasks yet'}
                    color="warning"
                    to="/specs"
                />
                <StatCard
                    icon={<Activity size={20} />}
                    label="AI Proxy"
                    value={aiHealth === null ? 'Checking...' : aiHealth ? 'Connected' : 'Offline'}
                    sub="Gemini via ProxyPal"
                    color={aiHealth ? 'success' : 'danger'}
                />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent specs */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-200">Recent Specifications</h2>
                        <Link to="/specs" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>
                    {specs.length === 0 ? (
                        <p className="text-gray-500 text-sm">No specifications yet. Create one in the Specs tab.</p>
                    ) : (
                        <div className="space-y-2">
                            {specs.slice(0, 5).map(spec => (
                                <Link
                                    key={spec.id}
                                    to={`/specs/${spec.id}`}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-200">{spec.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {spec.tasks.length} tasks • Updated {new Date(spec.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <StatusBadge status={spec.status} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* File changes */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-200">Recent File Changes</h2>
                        <Link to="/engineer" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                            AI Review <ArrowRight size={12} />
                        </Link>
                    </div>
                    {changes.length === 0 ? (
                        <p className="text-gray-500 text-sm">No file changes detected. Setup a repo and start watching.</p>
                    ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            {changes.slice(-10).reverse().map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${c.type === 'added' ? 'bg-success' : c.type === 'deleted' ? 'bg-danger' : 'bg-warning'
                                        }`} />
                                    <span className="text-gray-400 font-mono truncate flex-1">{c.relativePath}</span>
                                    <span className="text-gray-600">{new Date(c.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick actions */}
            {!repoPath && (
                <div className="card border-accent/30 bg-accent/5">
                    <div className="flex items-center gap-4">
                        <Zap size={24} className="text-accent" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-200">Get Started</h3>
                            <p className="text-sm text-gray-400">Paste your repository path to begin setting up agent workflows.</p>
                        </div>
                        <Link to="/repo" className="btn-primary btn-sm">
                            Setup Repo
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, sub, color, to }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    color: string;
    to?: string;
}) {
    const colorClasses: Record<string, string> = {
        accent: 'border-accent/20 hover:border-accent/40',
        success: 'border-success/20 hover:border-success/40',
        warning: 'border-warning/20 hover:border-warning/40',
        danger: 'border-danger/20 hover:border-danger/40',
    };
    const iconColor: Record<string, string> = {
        accent: 'text-accent',
        success: 'text-success',
        warning: 'text-warning',
        danger: 'text-danger',
    };

    const card = (
        <div className={`card transition-all duration-200 ${colorClasses[color] ?? ''}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-surface-2 ${iconColor[color] ?? ''}`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="font-semibold text-gray-100 mt-0.5">{value}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>
                </div>
            </div>
        </div>
    );

    return to ? <Link to={to}>{card}</Link> : card;
}
