import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../lib/store.js';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';
import MarkdownView from '../components/MarkdownView.js';
import {
    Bug, Plus, Loader2, Sparkles, ChevronDown, ChevronUp,
    AlertTriangle, AlertCircle, Info, XCircle
} from 'lucide-react';
import type { Bug as BugType } from '../../shared/types.js';

const SEVERITY_ICONS: Record<string, any> = {
    critical: XCircle,
    high: AlertTriangle,
    medium: AlertCircle,
    low: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-amber-400',
    low: 'text-blue-400',
};

export default function Bugs() {
    const { repoPath, addToast } = useApp();
    const [bugs, setBugs] = useState<BugType[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        title: '',
        description: '',
        stepsToReproduce: '',
        severity: 'medium' as BugType['severity'],
    });

    const fetchBugs = useCallback(async () => {
        if (!repoPath) return;
        setLoading(true);
        try {
            setBugs(await api.bugs.list(repoPath));
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    }, [repoPath, addToast]);

    useEffect(() => { fetchBugs(); }, [fetchBugs]);

    const handleCreate = async () => {
        if (!form.title.trim() || !repoPath) return;
        setCreating(true);
        try {
            await api.bugs.create(repoPath, form);
            setForm({ title: '', description: '', stepsToReproduce: '', severity: 'medium' });
            setShowForm(false);
            addToast({ type: 'success', message: 'Bug report created' });
            fetchBugs();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (bugId: string, status: BugType['status']) => {
        if (!repoPath) return;
        try {
            await api.bugs.updateStatus(repoPath, bugId, status);
            fetchBugs();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        }
    };

    const handleAnalyze = async (bugId: string) => {
        if (!repoPath) return;
        setAnalyzing(bugId);
        try {
            let result = '';
            for await (const chunk of api.bugs.analyze(repoPath, bugId)) {
                result += chunk;
                setAnalysisResults(prev => ({ ...prev, [bugId]: result }));
            }
            addToast({ type: 'success', message: 'AI analysis complete' });
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setAnalyzing(null);
        }
    };

    if (!repoPath) {
        return (
            <div className="card text-center py-12">
                <Bug size={40} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Set up a repository first to track bugs.</p>
            </div>
        );
    }

    const openBugs = bugs.filter(b => b.status === 'open');
    const inProgress = bugs.filter(b => b.status === 'in-progress');
    const resolved = bugs.filter(b => b.status === 'resolved' || b.status === 'closed');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Bug Tracker</h1>
                    <p className="text-gray-500 text-sm mt-1">Track bugs, get AI analysis, and manage resolution.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    Report Bug
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Open" count={openBugs.length} color="text-red-400" />
                <StatCard label="In Progress" count={inProgress.length} color="text-amber-400" />
                <StatCard label="Resolved" count={resolved.length} color="text-emerald-400" />
            </div>

            {/* Form */}
            {showForm && (
                <div className="card border-indigo-500/30">
                    <h3 className="font-semibold text-gray-200 mb-4">New Bug Report</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Title *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Brief description of the bug"
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Description</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="What happened? What did you expect?"
                                rows={3}
                                className="input resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Steps to Reproduce</label>
                            <textarea
                                value={form.stepsToReproduce}
                                onChange={e => setForm({ ...form, stepsToReproduce: e.target.value })}
                                placeholder="1. Go to...\n2. Click on...\n3. See error..."
                                rows={3}
                                className="input resize-none font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Severity</label>
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high', 'critical'] as const).map(s => {
                                    const Icon = SEVERITY_ICONS[s];
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setForm({ ...form, severity: s })}
                                            className={`btn-sm flex items-center gap-1.5 capitalize ${form.severity === s ? 'btn-primary' : 'btn-secondary'
                                                }`}
                                        >
                                            <Icon size={12} className={SEVERITY_COLORS[s]} />
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleCreate} disabled={creating || !form.title.trim()} className="btn-primary flex items-center gap-2">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Create Bug
                            </button>
                            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bug list */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            ) : bugs.length === 0 ? (
                <div className="card text-center py-12">
                    <Bug size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No bugs reported. That's great!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {bugs.map(bug => {
                        const SevIcon = SEVERITY_ICONS[bug.severity] || Info;
                        const expanded = expandedId === bug.id;
                        return (
                            <div key={bug.id} className="card">
                                <div
                                    className="flex items-start gap-3 cursor-pointer"
                                    onClick={() => setExpandedId(expanded ? null : bug.id)}
                                >
                                    <SevIcon size={18} className={`${SEVERITY_COLORS[bug.severity]} mt-0.5 shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-gray-200 truncate">{bug.title}</h3>
                                            <StatusBadge status={bug.status} />
                                            <span className="text-xs text-gray-600 capitalize hidden sm:inline">{bug.severity}</span>
                                        </div>
                                        {bug.description && !expanded && (
                                            <p className="text-sm text-gray-500 mt-0.5 truncate">{bug.description}</p>
                                        )}
                                    </div>
                                    {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                </div>

                                {expanded && (
                                    <div className="mt-4 pt-4 border-t border-surface-3 space-y-4">
                                        {bug.description && (
                                            <div>
                                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Description</h4>
                                                <p className="text-sm text-gray-300">{bug.description}</p>
                                            </div>
                                        )}
                                        {bug.stepsToReproduce && (
                                            <div>
                                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Steps to Reproduce</h4>
                                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-surface-0 p-3 rounded">{bug.stepsToReproduce}</pre>
                                            </div>
                                        )}

                                        {/* Status controls */}
                                        <div>
                                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Status</h4>
                                            <div className="flex gap-2">
                                                {(['open', 'in-progress', 'resolved', 'closed'] as const).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={e => { e.stopPropagation(); handleStatusChange(bug.id, s); }}
                                                        className={`btn-sm capitalize ${bug.status === s ? 'btn-primary' : 'btn-secondary'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* AI Analysis */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-medium text-gray-500 uppercase">AI Analysis</h4>
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleAnalyze(bug.id); }}
                                                    disabled={analyzing === bug.id}
                                                    className="btn-primary btn-sm flex items-center gap-2"
                                                >
                                                    {analyzing === bug.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    Analyze
                                                </button>
                                            </div>
                                            {analysisResults[bug.id] && (
                                                <MarkdownView content={analysisResults[bug.id]} />
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-600">
                                            Created: {new Date(bug.createdAt).toLocaleString()}
                                            {bug.updatedAt && <span> · Updated: {new Date(bug.updatedAt).toLocaleString()}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className="card text-center">
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}
