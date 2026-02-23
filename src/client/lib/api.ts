/**
 * API client – typed fetch wrapper for the backend.
 */

import type { ApiResponse } from '../../shared/types.js';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!json.ok) throw new Error(json.error ?? 'Unknown error');
    return json.data as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

function put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

function get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
}

function del<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
}

// ── Streaming helpers ────────────────────────────────────────

async function* streamPost(path: string, body: unknown): AsyncGenerator<string> {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Stream error');
    }
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            try {
                const parsed = JSON.parse(data);
                if (parsed.content) yield parsed.content;
                if (parsed.done) return;
            } catch { /* skip */ }
        }
    }
}

// ── Typed API ────────────────────────────────────────────────

import type { RepoProfile, Skill, SkillIndex, Spec, Bug, ChromeSession, FileChange, AIConfig, AIMessage } from '../../shared/types.js';

export const api = {
    // Health
    health: () => get<{ ok: boolean; version: string; uptime: number }>('/health'),

    // Repo
    repo: {
        scan: (repoPath: string) => post<RepoProfile>('/repo/scan', { repoPath }),
        setup: (repoPath: string) => post<{ profile: RepoProfile; files: string[] }>('/repo/setup', { repoPath }),
        profile: (path: string) => get<RepoProfile>(`/repo/profile?path=${encodeURIComponent(path)}`),
        context: (path: string) => get<string>(`/repo/context?path=${encodeURIComponent(path)}`),
        templateVars: (path: string) => get<Record<string, string>>(`/repo/template-vars?path=${encodeURIComponent(path)}`),
        watch: (repoPath: string) => post<{ watching: boolean }>('/repo/watch', { repoPath }),
        unwatch: (repoPath: string) => post<void>('/repo/unwatch', { repoPath }),
        getChanges: (path: string, since?: string) =>
            get<FileChange[]>(`/repo/changes?path=${encodeURIComponent(path)}${since ? `&since=${since}` : ''}`),
        clearChanges: (path: string) => del<void>(`/repo/changes?path=${encodeURIComponent(path)}`),
        steeringContext: (path: string) => get<string>(`/repo/steering-context?path=${encodeURIComponent(path)}`),
        specContext: (path: string, specId?: string) =>
            get<string>(`/repo/spec-context?path=${encodeURIComponent(path)}${specId ? `&specId=${specId}` : ''}`),
        templateContext: () => get<{ availableTemplates: string[]; templates: Record<string, string> }>('/repo/template-context'),
    },

    // Skills
    skills: {
        list: () => get<Skill[]>('/skills'),
        add: (githubUrl: string) => post<Skill>('/skills', { githubUrl }),
        update: (id: string) => put<Skill>(`/skills/${id}`, {}),
        updateAll: () => put<Skill[]>('/skills', {}),
        remove: (id: string) => del<void>(`/skills/${id}`),
        getIndex: () => get<SkillIndex>('/skills/index'),
    },

    // Specs
    specs: {
        list: (repoPath: string) => get<Spec[]>(`/specs?repoPath=${encodeURIComponent(repoPath)}`),
        create: (repoPath: string, name: string) =>
            post<Spec>('/specs', { repoPath, name }),
        get: (repoPath: string, specId: string) =>
            get<Spec>(`/specs/${specId}?repoPath=${encodeURIComponent(repoPath)}`),
        delete: (repoPath: string, specId: string) =>
            del<void>(`/specs/${specId}?repoPath=${encodeURIComponent(repoPath)}`),
        generateRequirements: (repoPath: string, specId: string) =>
            streamPost(`/specs/${specId}/requirements`, { repoPath }),
        generateDesign: (repoPath: string, specId: string) =>
            streamPost(`/specs/${specId}/design`, { repoPath }),
        generateTasks: (repoPath: string, specId: string) =>
            streamPost(`/specs/${specId}/tasks`, { repoPath }),
        updateTask: (repoPath: string, specId: string, taskId: string, status: string, output?: string) =>
            put<Spec>(`/specs/${specId}/tasks/${taskId}`, { repoPath, status, output }),
    },

    // Bugs
    bugs: {
        list: (repoPath: string) => get<Bug[]>(`/specs/bugs/list?repoPath=${encodeURIComponent(repoPath)}`),
        create: (repoPath: string, data: { title: string; description: string; stepsToReproduce: string; severity: string }) =>
            post<Bug>('/specs/bugs', { repoPath, ...data }),
        updateStatus: (repoPath: string, bugId: string, status: string, resolution?: string) =>
            put<Bug>(`/specs/bugs/${bugId}`, { repoPath, status, resolution }),
        analyze: (repoPath: string, bugId: string) =>
            streamPost(`/specs/bugs/${bugId}/analyze`, { repoPath }),
    },

    // AI
    ai: {
        config: () => get<AIConfig>('/ai/config'),
        setConfig: (config: Partial<AIConfig>) => put<void>('/ai/config', config),
        chat: (messages: AIMessage[]) => post<string>('/ai/chat', { messages }),
        chatStream: (messages: AIMessage[]) => streamPost('/ai/chat/stream', { messages }),
        analyzeRepo: (repoPath: string) => streamPost('/ai/analyze-repo', { repoPath }),
        health: () => get<{ reachable: boolean; status: number }>('/ai/health'),
    },

    // Engineer (Chrome bridge)
    engineer: {
        getSession: () => get<ChromeSession | null>('/engineer/chrome/status'),
        launch: (target: string, profilePath?: string) =>
            post<ChromeSession>('/engineer/chrome/launch', { target, profilePath }),
        close: () => post<void>('/engineer/chrome/close', {}),
        chromeConfig: () => get<{ executablePath: string; profilePath: string; headless: boolean }>('/engineer/chrome/config'),
        setChromeConfig: (config: Record<string, unknown>) => put<void>('/engineer/chrome/config', config),
        review: (filePaths: string[], target: string) =>
            post<string>('/engineer/review', { target, filePaths }),
        send: (content: string, target: string) =>
            post<string>('/engineer/send', { target, content }),
    },
};
