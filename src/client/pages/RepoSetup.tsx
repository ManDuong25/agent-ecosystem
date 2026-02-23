import { useState, useCallback } from 'react';
import { useApp } from '../lib/store.js';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';
import MarkdownView from '../components/MarkdownView.js';
import { FolderGit2, Play, Loader2, Check, FileCode, Eye } from 'lucide-react';
import type { RepoProfile } from '../../shared/types.js';

export default function RepoSetup() {
    const { repoPath, setRepoPath, profile, setProfile, addToast } = useApp();
    const [inputPath, setInputPath] = useState(repoPath);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const handleSetup = useCallback(async () => {
        if (!inputPath.trim()) return;
        setLoading(true);
        setLogs([]);
        setFiles([]);
        try {
            setLogs(prev => [...prev, `Scanning ${inputPath}...`]);
            const result = await api.repo.setup(inputPath.trim());
            setProfile(result.profile);
            setRepoPath(inputPath.trim());
            setFiles(result.files);
            setLogs(prev => [...prev, `Scan complete: ${result.profile.totalFiles} files, ${result.profile.frameworks.join(', ')}`, `Generated ${result.files.length} agent bridge files`]);
            addToast({ type: 'success', message: `Repo setup complete! ${result.files.length} files generated.` });
        } catch (err: any) {
            setLogs(prev => [...prev, `Error: ${err.message}`]);
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    }, [inputPath, setProfile, setRepoPath, addToast]);

    const handleAnalyze = useCallback(async () => {
        if (!repoPath) return;
        setAnalyzing(true);
        setAnalysis('');
        try {
            for await (const chunk of api.ai.analyzeRepo(repoPath)) {
                setAnalysis(prev => prev + chunk);
            }
        } catch (err: any) {
            addToast({ type: 'error', message: `AI analysis failed: ${err.message}` });
        } finally {
            setAnalyzing(false);
        }
    }, [repoPath, addToast]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100">Repository Setup</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Paste your repo path to auto-generate agent bridge files for Copilot, Codex, Claude, and Gemini.
                </p>
            </div>

            {/* Path input */}
            <div className="card">
                <label className="block text-sm font-medium text-gray-300 mb-2">Repository Path</label>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <FolderGit2 size={16} className="absolute left-3 top-3 text-gray-500" />
                        <input
                            type="text"
                            value={inputPath}
                            onChange={e => setInputPath(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSetup()}
                            placeholder="D:\my-project or /home/user/my-project"
                            className="input pl-10"
                        />
                    </div>
                    <button onClick={handleSetup} disabled={loading || !inputPath.trim()} className="btn-primary flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        {loading ? 'Scanning...' : 'Scan & Setup'}
                    </button>
                </div>
            </div>

            {/* Logs */}
            {logs.length > 0 && (
                <div className="card bg-surface-0 border-surface-3 font-mono text-sm">
                    {logs.map((log, i) => (
                        <div key={i} className={`py-1 ${log.startsWith('Error') ? 'text-danger' : 'text-gray-400'}`}>
                            <span className="text-gray-600 mr-2">{'>'}</span>{log}
                        </div>
                    ))}
                </div>
            )}

            {/* Profile */}
            {profile && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h2 className="font-semibold text-gray-200 mb-4">Repository Profile</h2>
                        <dl className="space-y-3 text-sm">
                            <ProfileRow label="Name" value={profile.name} />
                            <ProfileRow label="Architecture" value={profile.architecture} />
                            <ProfileRow label="Total Files" value={String(profile.totalFiles)} />
                            <ProfileRow label="Languages" value={Object.entries(profile.languages).sort((a, b) => b[1] - a[1]).map(([l, c]) => `${l} (${c})`).join(', ')} />
                            <ProfileRow label="Frameworks" value={profile.frameworks.join(', ') || 'None detected'} />
                            <ProfileRow label="Key Roots" value={profile.keyRoots.join(', ')} />
                            <ProfileRow label="Behavior Signals" value={profile.behaviorSignals.join(', ') || 'None'} />
                            {profile.validationCommands.backend && <ProfileRow label="Backend Validation" value={profile.validationCommands.backend} mono />}
                            {profile.validationCommands.frontend && <ProfileRow label="Frontend Validation" value={profile.validationCommands.frontend} mono />}
                        </dl>
                    </div>

                    <div className="card">
                        <h2 className="font-semibold text-gray-200 mb-4">Generated Files</h2>
                        {files.length > 0 ? (
                            <div className="space-y-1">
                                {files.map(f => (
                                    <div key={f} className="flex items-center gap-2 text-sm py-1">
                                        <Check size={14} className="text-success shrink-0" />
                                        <FileCode size={14} className="text-gray-500 shrink-0" />
                                        <span className="text-gray-300 font-mono text-xs">{f}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Run setup to generate files.</p>
                        )}
                    </div>
                </div>
            )}

            {/* AI Analysis */}
            {profile && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold text-gray-200">AI Repository Analysis</h2>
                            <p className="text-xs text-gray-500 mt-1">Uses Gemini 3.1 Pro via ProxyPal to analyze your codebase</p>
                        </div>
                        <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary btn-sm flex items-center gap-2">
                            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                        </button>
                    </div>
                    {analysis && <MarkdownView content={analysis} />}
                </div>
            )}
        </div>
    );
}

function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex gap-4">
            <dt className="text-gray-500 w-36 shrink-0">{label}</dt>
            <dd className={`text-gray-300 ${mono ? 'font-mono text-xs bg-surface-2 px-2 py-0.5 rounded' : ''}`}>{value}</dd>
        </div>
    );
}
