import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../lib/store.js';
import { api } from '../lib/api.js';
import { useSocket } from '../lib/socket.js';
import StatusBadge from '../components/StatusBadge.js';
import {
    Chrome, Play, Square, Send, Loader2, FileCode, RefreshCw,
    Eye, Settings, MessageSquare, Sparkles
} from 'lucide-react';
import type { ChromeSession, FileChange } from '../../shared/types.js';

type Target = 'gemini' | 'chatgpt';

export default function AIEngineer() {
    const { repoPath, addToast } = useApp();
    const { on, off } = useSocket();

    const [session, setSession] = useState<ChromeSession | null>(null);
    const [changes, setChanges] = useState<FileChange[]>([]);
    const [target, setTarget] = useState<Target>('gemini');
    const [profilePath, setProfilePath] = useState('');
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    // Fetch session and changes
    const fetchState = useCallback(async () => {
        try {
            const [sess, changesData] = await Promise.all([
                api.engineer.getSession().catch(() => null),
                repoPath ? api.repo.getChanges(repoPath) : Promise.resolve([]),
            ]);
            setSession(sess);
            setChanges(changesData);
        } catch { }
    }, [repoPath]);

    useEffect(() => { fetchState(); }, [fetchState]);

    // WebSocket listeners
    useEffect(() => {
        const onChromeStatus = (data: any) => setSession(prev => prev ? { ...prev, ...data } : data);
        const onFileChange = (change: FileChange) => setChanges(prev => [change, ...prev].slice(0, 100));
        on('chrome-status', onChromeStatus);
        on('file-change', onFileChange);
        return () => { off('chrome-status', onChromeStatus); off('file-change', onFileChange); };
    }, [on, off]);

    const handleLaunch = async () => {
        setLoading('launch');
        try {
            const sess = await api.engineer.launch(target, profilePath || undefined);
            setSession(sess);
            addToast({ type: 'success', message: `Chrome launched → ${target}` });
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    const handleClose = async () => {
        setLoading('close');
        try {
            await api.engineer.close();
            setSession(null);
            addToast({ type: 'success', message: 'Chrome session closed' });
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;
        setLoading('send');
        setResponse('');
        try {
            const result = await api.engineer.send(message, target);
            setResponse(result);
            addToast({ type: 'success', message: 'Response received from AI' });
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    const handleReview = async () => {
        if (selectedFiles.size === 0 && changes.length === 0) {
            addToast({ type: 'warning', message: 'No files to review' });
            return;
        }
        setLoading('review');
        setResponse('');
        const filePaths = selectedFiles.size > 0
            ? Array.from(selectedFiles)
            : changes.slice(0, 20).map(c => c.path);
        try {
            const result = await api.engineer.review(filePaths, target);
            setResponse(result);
            addToast({ type: 'success', message: 'Review complete' });
        } catch (err: any) {
            addToast({ type: 'error', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    const toggleFile = (path: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">AI Engineer Loop</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Detect file changes, send code to Gemini/ChatGPT via Chrome, get AI review.
                    </p>
                </div>
                <button onClick={() => setShowConfig(!showConfig)} className="btn-ghost btn-sm">
                    <Settings size={16} />
                </button>
            </div>

            {/* Config panel */}
            {showConfig && (
                <div className="card border-indigo-500/30">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Chrome Configuration</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Chrome Profile Path (optional)</label>
                            <input
                                type="text"
                                value={profilePath}
                                onChange={e => setProfilePath(e.target.value)}
                                placeholder="C:\Users\you\AppData\Local\Google\Chrome\User Data\Profile 1"
                                className="input text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Target AI</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTarget('gemini')}
                                    className={`btn-sm flex-1 ${target === 'gemini' ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    Gemini
                                </button>
                                <button
                                    onClick={() => setTarget('chatgpt')}
                                    className={`btn-sm flex-1 ${target === 'chatgpt' ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    ChatGPT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chrome controls */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Chrome size={20} className={session?.active ? 'text-success' : 'text-gray-600'} />
                        <div>
                            <div className="text-sm font-medium text-gray-200">
                                Chrome Session {session?.active ? 'Active' : 'Inactive'}
                            </div>
                            {session?.active && (
                                <div className="text-xs text-gray-500">
                                    Target: {session.target} · PID: {session.pid || 'N/A'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-surface-2 rounded-lg p-0.5 mr-2">
                            <button
                                onClick={() => setTarget('gemini')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${target === 'gemini' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                            >
                                Gemini
                            </button>
                            <button
                                onClick={() => setTarget('chatgpt')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${target === 'chatgpt' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                            >
                                ChatGPT
                            </button>
                        </div>

                        {session?.active ? (
                            <button onClick={handleClose} disabled={loading === 'close'} className="btn-danger btn-sm flex items-center gap-2">
                                {loading === 'close' ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                Close
                            </button>
                        ) : (
                            <button onClick={handleLaunch} disabled={loading === 'launch'} className="btn-primary flex items-center gap-2">
                                {loading === 'launch' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Launch Chrome
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File changes */}
                <div className="card max-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
                            <FileCode size={16} /> File Changes
                            {changes.length > 0 && <span className="badge-info text-xs">{changes.length}</span>}
                        </h2>
                        <button onClick={fetchState} className="btn-ghost btn-sm"><RefreshCw size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {changes.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No file changes detected</p>
                        ) : (
                            changes.map((change, i) => (
                                <label key={`${change.path}-${i}`} className="flex items-center gap-2 p-2 rounded hover:bg-surface-2 cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedFiles.has(change.path)}
                                        onChange={() => toggleFile(change.path)}
                                        className="rounded border-surface-4 bg-surface-2 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <StatusBadge status={change.type} size="sm" />
                                    <span className="font-mono text-xs text-gray-400 truncate">{change.path}</span>
                                </label>
                            ))
                        )}
                    </div>
                    {changes.length > 0 && (
                        <div className="pt-3 border-t border-surface-3 mt-3">
                            <button
                                onClick={handleReview}
                                disabled={!session?.active || loading === 'review'}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading === 'review' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                                Send {selectedFiles.size || Math.min(changes.length, 20)} files for AI Review
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat / Response */}
                <div className="card max-h-[500px] flex flex-col">
                    <h2 className="font-semibold text-gray-200 flex items-center gap-2 mb-3">
                        <MessageSquare size={16} /> AI Communication
                    </h2>
                    <div className="flex-1 overflow-y-auto mb-3 bg-surface-0 rounded-lg p-3">
                        {response ? (
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{response}</pre>
                        ) : (
                            <p className="text-gray-600 text-sm text-center py-8">
                                {session?.active ? 'Send a message or files to get AI feedback' : 'Launch Chrome to start'}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
                            placeholder="Type a message to send to AI... (Ctrl+Enter to send)"
                            rows={2}
                            className="input flex-1 resize-none text-sm"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!session?.active || !message.trim() || loading === 'send'}
                            className="btn-primary self-end flex items-center gap-2"
                        >
                            {loading === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
