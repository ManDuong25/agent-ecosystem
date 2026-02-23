import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../lib/store.js';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';
import MarkdownView from '../components/MarkdownView.js';
import {
    Plus, Loader2, FileText, Layout, ListChecks, Sparkles,
    ChevronRight, Trash2, ArrowLeft, CheckCircle2, Circle, Clock
} from 'lucide-react';
import type { Spec, SpecTask } from '../../shared/types.js';

/* ——————————————————————  ENTRY  —————————————————————— */
export default function Specs() {
    const { specId } = useParams<{ specId: string }>();
    return specId ? <SpecDetail specId={specId} /> : <SpecList />;
}

/* ——————————————————————  LIST  —————————————————————— */
function SpecList() {
    const { repoPath, addToast } = useApp();
    const navigate = useNavigate();
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');

    const fetchSpecs = useCallback(async () => {
        if (!repoPath) return;
        setLoading(true);
        try {
            setSpecs(await api.specs.list(repoPath));
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    }, [repoPath, addToast]);

    useEffect(() => { fetchSpecs(); }, [fetchSpecs]);

    const handleCreate = async () => {
        if (!name.trim() || !repoPath) return;
        setCreating(true);
        try {
            const spec = await api.specs.create(repoPath, name.trim());
            setName('');
            addToast({ type: 'success', message: `Spec "${spec.name}" created` });
            navigate(`/specs/${spec.id}`);
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, specName: string) => {
        if (!confirm(`Delete spec "${specName}"?`)) return;
        try {
            await api.specs.delete(repoPath, id);
            addToast({ type: 'success', message: 'Spec deleted' });
            fetchSpecs();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        }
    };

    if (!repoPath) {
        return (
            <div className="card text-center py-12">
                <FileText size={40} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Set up a repository first.</p>
                <Link to="/repo" className="text-indigo-400 text-sm hover:underline mt-2 inline-block">Go to Repo Setup</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100">Specifications</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Spec-driven development: Requirements (EARS) → Design (Mermaid) → Tasks (TDD)
                </p>
            </div>

            {/* Create */}
            <div className="card">
                <label className="block text-sm font-medium text-gray-300 mb-2">New Specification</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="Feature name, e.g. User Authentication Flow"
                        className="input flex-1"
                    />
                    <button onClick={handleCreate} disabled={creating || !name.trim()} className="btn-primary flex items-center gap-2">
                        {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Create Spec
                    </button>
                </div>
            </div>

            {/* Spec list */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            ) : specs.length === 0 ? (
                <div className="card text-center py-12">
                    <Layout size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No specs yet. Create one above to start.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {specs.map(spec => (
                        <Link key={spec.id} to={`/specs/${spec.id}`} className="card hover:border-surface-4 transition-colors flex items-center gap-4 group">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-gray-200 truncate">{spec.name}</h3>
                                    <StatusBadge status={spec.status} />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                    <span>{spec.tasks?.length ?? 0} tasks</span>
                                    <span>{spec.tasks?.filter(t => t.status === 'done').length ?? 0} done</span>
                                    <span>Created {new Date(spec.createdAt).toLocaleDateString()}</span>
                                </div>
                                {/* Progress bar */}
                                {spec.tasks && spec.tasks.length > 0 && (
                                    <div className="w-full bg-surface-2 rounded-full h-1.5 mt-2">
                                        <div
                                            className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${(spec.tasks.filter(t => t.status === 'done').length / spec.tasks.length) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={e => { e.preventDefault(); handleDelete(spec.id, spec.name); }}
                                className="btn-ghost btn-sm text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                            <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ——————————————————————  DETAIL  —————————————————————— */
type Tab = 'overview' | 'requirements' | 'design' | 'tasks';

function SpecDetail({ specId }: { specId: string }) {
    const { repoPath, addToast } = useApp();
    const navigate = useNavigate();
    const [spec, setSpec] = useState<Spec | null>(null);
    const [tab, setTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [streamContent, setStreamContent] = useState('');

    const fetchSpec = useCallback(async () => {
        if (!repoPath) return;
        try {
            setSpec(await api.specs.get(repoPath, specId));
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    }, [repoPath, specId, addToast]);

    useEffect(() => { fetchSpec(); }, [fetchSpec]);

    const handleGenerate = async (phase: 'requirements' | 'design' | 'tasks') => {
        if (!repoPath) return;
        setGenerating(phase);
        setStreamContent('');
        setTab(phase);
        try {
            if (phase === 'requirements') {
                for await (const chunk of api.specs.generateRequirements(repoPath, specId)) {
                    setStreamContent(prev => prev + chunk);
                }
            } else if (phase === 'design') {
                for await (const chunk of api.specs.generateDesign(repoPath, specId)) {
                    setStreamContent(prev => prev + chunk);
                }
            } else {
                for await (const chunk of api.specs.generateTasks(repoPath, specId)) {
                    setStreamContent(prev => prev + chunk);
                }
            }
            addToast({ type: 'success', message: `${phase} generated!` });
            fetchSpec();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setGenerating(null);
            setStreamContent('');
        }
    };

    const handleTaskToggle = async (taskId: string, status: string) => {
        if (!repoPath) return;
        const newStatus = status === 'done' ? 'pending' : 'done';
        try {
            await api.specs.updateTask(repoPath, specId, taskId, newStatus);
            fetchSpec();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-500" size={24} /></div>;
    if (!spec) return <div className="card text-center py-12"><p className="text-gray-400">Spec not found.</p></div>;

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'overview', label: 'Overview', icon: Layout },
        { key: 'requirements', label: 'Requirements', icon: FileText },
        { key: 'design', label: 'Design', icon: Sparkles },
        { key: 'tasks', label: 'Tasks', icon: ListChecks },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/specs')} className="btn-ghost btn-sm"><ArrowLeft size={16} /></button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-100">{spec.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <StatusBadge status={spec.status} />
                        <span className="text-xs text-gray-600">ID: {spec.id}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-surface-3 pb-px">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <PhaseCard
                        title="Requirements (EARS)"
                        description="Generate structured requirements using EARS notation"
                        hasContent={!!spec.requirements}
                        generating={generating === 'requirements'}
                        onGenerate={() => handleGenerate('requirements')}
                        onView={() => setTab('requirements')}
                    />
                    <PhaseCard
                        title="Design (Mermaid)"
                        description="Generate architecture design with Mermaid diagrams"
                        hasContent={!!spec.design}
                        generating={generating === 'design'}
                        onGenerate={() => handleGenerate('design')}
                        onView={() => setTab('design')}
                    />
                    <PhaseCard
                        title="Tasks (TDD)"
                        description="Generate implementation tasks with TDD approach"
                        hasContent={!!spec.tasks && spec.tasks.length > 0}
                        generating={generating === 'tasks'}
                        onGenerate={() => handleGenerate('tasks')}
                        onView={() => setTab('tasks')}
                    />
                </div>
            )}

            {tab === 'requirements' && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-200">Requirements (EARS Format)</h2>
                        <button
                            onClick={() => handleGenerate('requirements')}
                            disabled={!!generating}
                            className="btn-primary btn-sm flex items-center gap-2"
                        >
                            {generating === 'requirements' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {spec.requirements ? 'Regenerate' : 'Generate'}
                        </button>
                    </div>
                    {generating === 'requirements' && streamContent ? (
                        <MarkdownView content={streamContent} />
                    ) : spec.requirements ? (
                        <MarkdownView content={spec.requirements} />
                    ) : (
                        <EmptyPhase label="requirements" />
                    )}
                </div>
            )}

            {tab === 'design' && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-200">Architecture Design</h2>
                        <button
                            onClick={() => handleGenerate('design')}
                            disabled={!!generating}
                            className="btn-primary btn-sm flex items-center gap-2"
                        >
                            {generating === 'design' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {spec.design ? 'Regenerate' : 'Generate'}
                        </button>
                    </div>
                    {generating === 'design' && streamContent ? (
                        <MarkdownView content={streamContent} />
                    ) : spec.design ? (
                        <MarkdownView content={spec.design} />
                    ) : (
                        <EmptyPhase label="design" />
                    )}
                </div>
            )}

            {tab === 'tasks' && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-200">Implementation Tasks</h2>
                        <button
                            onClick={() => handleGenerate('tasks')}
                            disabled={!!generating}
                            className="btn-primary btn-sm flex items-center gap-2"
                        >
                            {generating === 'tasks' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {spec.tasks && spec.tasks.length > 0 ? 'Regenerate' : 'Generate'}
                        </button>
                    </div>
                    {generating === 'tasks' && streamContent ? (
                        <MarkdownView content={streamContent} />
                    ) : spec.tasks && spec.tasks.length > 0 ? (
                        <TaskList tasks={spec.tasks} onToggle={handleTaskToggle} />
                    ) : (
                        <EmptyPhase label="tasks" />
                    )}
                </div>
            )}
        </div>
    );
}

/* ——————————————————————  SUB-COMPONENTS  —————————————————————— */

function PhaseCard({ title, description, hasContent, generating, onGenerate, onView }: {
    title: string; description: string; hasContent: boolean;
    generating: boolean; onGenerate: () => void; onView: () => void;
}) {
    return (
        <div className="card flex flex-col">
            <div className="flex items-center gap-2 mb-2">
                {hasContent ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} className="text-gray-600" />}
                <h3 className="font-medium text-gray-200">{title}</h3>
            </div>
            <p className="text-sm text-gray-500 flex-1">{description}</p>
            <div className="flex gap-2 mt-4">
                <button onClick={onGenerate} disabled={generating} className="btn-primary btn-sm flex-1 flex items-center justify-center gap-2">
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {hasContent ? 'Regenerate' : 'Generate'}
                </button>
                {hasContent && (
                    <button onClick={onView} className="btn-secondary btn-sm">View</button>
                )}
            </div>
        </div>
    );
}

function TaskList({ tasks, onToggle }: { tasks: SpecTask[]; onToggle: (id: string, status: string) => void }) {
    const done = tasks.filter(t => t.status === 'done').length;
    return (
        <div>
            <div className="flex items-center gap-3 mb-4 text-sm text-gray-400">
                <span>{done}/{tasks.length} completed</span>
                <div className="flex-1 bg-surface-2 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
                </div>
            </div>
            <div className="space-y-2">
                {tasks.map(task => (
                    <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${task.status === 'done' ? 'border-success/20 bg-success/5' : 'border-surface-3 bg-surface-1'
                        }`}>
                        <button onClick={() => onToggle(task.id, task.status)} className="mt-0.5 shrink-0">
                            {task.status === 'done'
                                ? <CheckCircle2 size={18} className="text-success" />
                                : task.status === 'in-progress'
                                    ? <Clock size={18} className="text-warning" />
                                    : <Circle size={18} className="text-gray-600 hover:text-gray-400 transition-colors" />
                            }
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                {task.title}
                            </div>
                            {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                            {task.testCriteria && (
                                <div className="text-xs text-gray-600 mt-1 font-mono bg-surface-0 px-2 py-1 rounded">
                                    Test: {task.testCriteria}
                                </div>
                            )}
                        </div>
                        <StatusBadge status={task.status} size="sm" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyPhase({ label }: { label: string }) {
    return (
        <div className="text-center py-8">
            <Sparkles size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm">No {label} generated yet. Click Generate to use AI.</p>
        </div>
    );
}
