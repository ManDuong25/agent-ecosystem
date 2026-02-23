import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../lib/store.js';
import { api } from '../lib/api.js';
import { useSocket } from '../lib/socket.js';
import StatusBadge from '../components/StatusBadge.js';
import { Plus, RefreshCw, Trash2, Loader2, Github, Package, Download } from 'lucide-react';
import type { Skill, SkillIndex } from '../../shared/types.js';

export default function Skills() {
    const { addToast } = useApp();
    const { on, off } = useSocket();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [index, setIndex] = useState<SkillIndex | null>(null);
    const [githubUrl, setGithubUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [addingSkill, setAddingSkill] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [updatingAll, setUpdatingAll] = useState(false);

    const fetchSkills = useCallback(async () => {
        setLoading(true);
        try {
            const [skillsList, skillIndex] = await Promise.all([
                api.skills.list(),
                api.skills.getIndex(),
            ]);
            setSkills(skillsList);
            setIndex(skillIndex);
        } catch (err: any) {
            addToast({ type: 'error', message: `Failed to load skills: ${err.message}` });
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchSkills();
    }, [fetchSkills]);

    useEffect(() => {
        const handler = () => fetchSkills();
        on('skill-updated', handler);
        return () => { off('skill-updated', handler); };
    }, [on, off, fetchSkills]);

    const handleAdd = useCallback(async () => {
        if (!githubUrl.trim()) return;
        setAddingSkill(true);
        try {
            await api.skills.add(githubUrl.trim());
            setGithubUrl('');
            addToast({ type: 'success', message: 'Skill source added successfully!' });
            fetchSkills();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setAddingSkill(false);
        }
    }, [githubUrl, addToast, fetchSkills]);

    const handleUpdate = useCallback(async (id: string) => {
        setUpdatingId(id);
        try {
            await api.skills.update(id);
            addToast({ type: 'success', message: 'Skill updated!' });
            fetchSkills();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setUpdatingId(null);
        }
    }, [addToast, fetchSkills]);

    const handleUpdateAll = useCallback(async () => {
        setUpdatingAll(true);
        try {
            await api.skills.updateAll();
            addToast({ type: 'success', message: 'All skills updated!' });
            fetchSkills();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setUpdatingAll(false);
        }
    }, [addToast, fetchSkills]);

    const handleRemove = useCallback(async (id: string, name: string) => {
        if (!confirm(`Remove skill source "${name}"?`)) return;
        try {
            await api.skills.remove(id);
            addToast({ type: 'success', message: `Removed "${name}"` });
            fetchSkills();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        }
    }, [addToast, fetchSkills]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Skill Management</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Add GitHub skill repos, update them, and manage your skill catalog.
                    </p>
                </div>
                <button onClick={handleUpdateAll} disabled={updatingAll || skills.length === 0} className="btn-secondary flex items-center gap-2">
                    {updatingAll ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Update All
                </button>
            </div>

            {/* Add skill */}
            <div className="card">
                <label className="block text-sm font-medium text-gray-300 mb-2">Add Skill Source</label>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Github size={16} className="absolute left-3 top-3 text-gray-500" />
                        <input
                            type="text"
                            value={githubUrl}
                            onChange={e => setGithubUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            placeholder="https://github.com/user/skills-repo"
                            className="input pl-10"
                        />
                    </div>
                    <button onClick={handleAdd} disabled={addingSkill || !githubUrl.trim()} className="btn-primary flex items-center gap-2">
                        {addingSkill ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Add
                    </button>
                </div>
            </div>

            {/* Index summary */}
            {index && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="card text-center">
                        <div className="text-2xl font-bold text-indigo-400">{index.totalSkills}</div>
                        <div className="text-xs text-gray-500 mt-1">Total Skills</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-2xl font-bold text-emerald-400">{index.categories?.length ?? Object.keys(index.entries).length}</div>
                        <div className="text-xs text-gray-500 mt-1">Categories</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-2xl font-bold text-amber-400">{skills.length}</div>
                        <div className="text-xs text-gray-500 mt-1">Sources</div>
                    </div>
                </div>
            )}

            {/* Skill list */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-gray-500" size={24} />
                </div>
            ) : skills.length === 0 ? (
                <div className="card text-center py-12">
                    <Package size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No skill sources added yet.</p>
                    <p className="text-gray-600 text-sm mt-1">Paste a GitHub URL above to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {skills.map(skill => (
                        <div key={skill.id} className="card hover:border-surface-4 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                    <Github size={20} className="text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-gray-200 truncate">{skill.name}</h3>
                                        <StatusBadge status={skill.status} />
                                    </div>
                                    {skill.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{skill.description}</p>}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                        <span className="font-mono">{skill.githubUrl}</span>
                                        <span>{skill.skillCount} skills</span>
                                        {skill.lastUpdated && <span>Updated {new Date(skill.lastUpdated).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleUpdate(skill.id)}
                                        disabled={updatingId === skill.id}
                                        className="btn-ghost btn-sm"
                                        title="Update"
                                    >
                                        {updatingId === skill.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    </button>
                                    <button onClick={() => handleRemove(skill.id, skill.name)} className="btn-ghost btn-sm text-danger hover:bg-danger/10" title="Remove">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
