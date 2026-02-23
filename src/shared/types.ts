/* ── Shared type definitions for Agent Ecosystem ── */

// ─── Repo Profile ────────────────────────────────────────────
export interface RepoProfile {
    name: string;
    rootPath: string;
    architecture: string;
    languages: Record<string, number>;
    frameworks: string[];
    keyRoots: string[];
    readFirstDocs: string[];
    behaviorSignals: string[];
    totalFiles: number;
    validationCommands: {
        backend?: string;
        frontend?: string;
        e2e?: string;
    };
    skillCatalog: {
        total: number;
        sources: number;
        indexPath: string;
    };
    scannedAt: string;
}

// ─── Skills ──────────────────────────────────────────────────
export interface Skill {
    id: string;
    name: string;
    githubUrl: string;
    localPath: string;
    description: string;
    lastUpdated: string;
    status: 'cloned' | 'updating' | 'error' | 'ready';
    skillCount: number;
}

export interface SkillIndex {
    totalSkills: number;
    categories?: string[];
    entries: Record<string, SkillEntry[]>;
    builtAt: string;
}

export interface SkillEntry {
    name: string;
    namespace: string;
    path: string;
    source: string;
    description: string;
}

// ─── Specifications (Spec-Kit) ───────────────────────────────
export type SpecPhase = 'specify' | 'requirements' | 'design' | 'tasks' | 'implement' | 'done';

export interface Spec {
    id: string;
    name: string;
    description: string;
    status: SpecPhase;
    createdAt: string;
    updatedAt: string;
    repoPath: string;
    requirements?: string;   // Markdown (EARS format)
    design?: string;          // Markdown with Mermaid
    tasks: SpecTask[];
    bugs: Bug[];
}

export interface SpecTask {
    id: string;
    specId: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'done' | 'failed';
    testFirst: boolean;
    testCriteria?: string;
    files: string[];
    output?: string;
}

// ─── Bugs ────────────────────────────────────────────────────
export interface Bug {
    id: string;
    specId?: string;
    title: string;
    description: string;
    stepsToReproduce: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in-progress' | 'investigating' | 'fixing' | 'resolved' | 'closed';
    resolution?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── AI ──────────────────────────────────────────────────────
export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIConfig {
    proxyUrl: string;
    proxyApiKey: string;
    managementApiKey: string;
    model: string;
}

export interface AIStreamChunk {
    content: string;
    done: boolean;
}

// ─── Chrome Bridge ───────────────────────────────────────────
export type ChromeTarget = 'gemini' | 'chatgpt';

export interface ChromeSession {
    id: string;
    target: ChromeTarget;
    profilePath: string;
    status: 'launching' | 'ready' | 'busy' | 'closed' | 'error';
    active: boolean;
    pid?: number;
    lastActivity: string;
}

export interface EngineerReview {
    id: string;
    files: FileChange[];
    target: ChromeTarget;
    prompt: string;
    response?: string;
    status: 'pending' | 'sending' | 'waiting' | 'done' | 'error';
    createdAt: string;
}

// ─── File Watching ───────────────────────────────────────────
export interface FileChange {
    path: string;
    relativePath: string;
    type: 'added' | 'modified' | 'deleted';
    timestamp: string;
    size?: number;
}

// ─── Optimization Contexts ───────────────────────────────────
export interface SteeringContext {
    repoProfile: RepoProfile;
    conventions: string;
    guidelines: string;
    validationGates: string[];
}

export interface SpecContext {
    currentSpec: Spec | null;
    requirements: string;
    design: string;
    tasksSummary: string;
}

export interface TemplateContext {
    availableTemplates: string[];
    templateVars: Record<string, string>;
}

// ─── WebSocket Events ────────────────────────────────────────
export interface WSEvent {
    type:
    | 'file-change'
    | 'scan-progress'
    | 'skill-update'
    | 'spec-update'
    | 'ai-stream'
    | 'chrome-status'
    | 'task-progress'
    | 'error'
    | 'info';
    payload: unknown;
}

// ─── API Responses ───────────────────────────────────────────
export interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}
