/**
 * RepoScanner – walks a repository and produces a RepoProfile.
 * Ported from the Go scanner, adapted for Node.js.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { RepoProfile } from '../../shared/types.js';
import { cache } from './cache.js';

// ── Language detection by extension ──────────────────────────
const LANG_MAP: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.dart': 'Dart',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++',
    '.c': 'C', '.h': 'C',
    '.html': 'HTML',
    '.css': 'CSS', '.scss': 'SCSS', '.less': 'LESS',
    '.sql': 'SQL',
    '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
    '.ps1': 'PowerShell',
    '.md': 'Markdown',
    '.yaml': 'YAML', '.yml': 'YAML',
    '.json': 'JSON',
};

// ── Framework detection patterns ─────────────────────────────
interface FrameworkSignature {
    name: string;
    files: string[];            // any of these files existing signals framework
    contentPatterns?: { file: string; pattern: string }[];
}

const FRAMEWORKS: FrameworkSignature[] = [
    { name: 'React', files: ['src/App.tsx', 'src/App.jsx', 'src/index.tsx', 'src/index.jsx'] },
    { name: 'Vite', files: ['vite.config.ts', 'vite.config.js'] },
    { name: 'Next.js', files: ['next.config.js', 'next.config.mjs', 'next.config.ts'] },
    { name: 'Vue', files: ['vue.config.js', 'nuxt.config.ts', 'src/App.vue'] },
    { name: 'Svelte', files: ['svelte.config.js'] },
    { name: 'Angular', files: ['angular.json'] },
    { name: 'FastAPI', files: [], contentPatterns: [{ file: '**/main.py', pattern: 'FastAPI' }] },
    { name: 'Django', files: ['manage.py'], contentPatterns: [{ file: 'manage.py', pattern: 'django' }] },
    { name: 'Flask', files: [], contentPatterns: [{ file: '**/app.py', pattern: 'Flask' }] },
    { name: 'Express', files: [], contentPatterns: [{ file: 'package.json', pattern: '"express"' }] },
    { name: 'NestJS', files: ['nest-cli.json'] },
    { name: 'Spring', files: ['pom.xml', 'build.gradle'], contentPatterns: [{ file: 'pom.xml', pattern: 'spring-boot' }] },
    { name: 'Rails', files: ['Gemfile'], contentPatterns: [{ file: 'Gemfile', pattern: 'rails' }] },
    { name: 'Laravel', files: ['artisan'] },
    { name: 'Tailwind', files: ['tailwind.config.js', 'tailwind.config.ts'] },
    { name: 'Prisma', files: ['prisma/schema.prisma'] },
    { name: 'Docker', files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'] },
];

// ── Behavior signal keywords ─────────────────────────────────
const BEHAVIOR_KEYWORDS: Record<string, string[]> = {
    geofence: ['geofence', 'geofencing', 'geo_fence', 'geoFence'],
    map: ['mapbox', 'leaflet', 'google-maps', 'maplibre', 'MapContainer'],
    narration: ['narration', 'tts', 'text-to-speech', 'audio', 'speechSynthesis'],
    offline: ['service-worker', 'serviceWorker', 'offline', 'workbox', 'sw.js', 'pwa'],
    i18n: ['i18n', 'intl', 'locale', 'translation', 'i18next'],
    auth: ['auth', 'jwt', 'oauth', 'session', 'login', 'signup'],
    realtime: ['websocket', 'socket.io', 'sse', 'real-time', 'realtime'],
};

// ── Ignored directories ──────────────────────────────────────
const IGNORED = new Set([
    'node_modules', '.git', '__pycache__', '.next', '.nuxt', 'dist', 'build',
    '.venv', 'venv', 'env', '.tox', 'coverage', '.nyc_output', '.cache',
    'vendor', 'target', 'bin', 'obj', '.terraform', '.serverless',
]);

// ── Scanner ──────────────────────────────────────────────────
export async function scanRepo(repoPath: string, onProgress?: (msg: string) => void): Promise<RepoProfile> {
    const cacheKey = `profile:${repoPath}`;
    const cached = cache.get<RepoProfile>(cacheKey);
    if (cached) {
        onProgress?.('Using cached profile');
        return cached;
    }

    const absPath = path.resolve(repoPath);
    if (!fs.existsSync(absPath)) throw new Error(`Path does not exist: ${absPath}`);

    const repoName = path.basename(absPath);
    onProgress?.(`Scanning ${repoName}...`);

    // Walk file tree
    const allFiles: string[] = [];
    const langCounts: Record<string, number> = {};

    function walk(dir: string) {
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
            if (IGNORED.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else {
                allFiles.push(full);
                const ext = path.extname(entry.name).toLowerCase();
                const lang = LANG_MAP[ext];
                if (lang) langCounts[lang] = (langCounts[lang] || 0) + 1;
            }
        }
    }

    walk(absPath);
    onProgress?.(`Found ${allFiles.length} files`);

    // Detect frameworks
    const detectedFrameworks: string[] = [];
    for (const fw of FRAMEWORKS) {
        let found = false;
        for (const f of fw.files) {
            if (fs.existsSync(path.join(absPath, f))) { found = true; break; }
        }
        if (!found && fw.contentPatterns) {
            for (const cp of fw.contentPatterns) {
                const target = cp.file.includes('*') ? findFileByGlob(absPath, cp.file, allFiles) : path.join(absPath, cp.file);
                if (target && fs.existsSync(target)) {
                    try {
                        const content = fs.readFileSync(target, 'utf-8');
                        if (content.includes(cp.pattern)) { found = true; break; }
                    } catch { /* skip */ }
                }
            }
        }
        if (found) detectedFrameworks.push(fw.name);
    }
    onProgress?.(`Frameworks: ${detectedFrameworks.join(', ') || 'none detected'}`);

    // Detect key roots (top-level directories that contain code)
    const keyRoots: string[] = [];
    const topDirs = fs.readdirSync(absPath, { withFileTypes: true }).filter(d => d.isDirectory() && !IGNORED.has(d.name) && !d.name.startsWith('.'));
    for (const d of topDirs) {
        const dirFiles = allFiles.filter(f => f.startsWith(path.join(absPath, d.name)));
        if (dirFiles.length > 0) keyRoots.push(`${d.name}/`);
    }

    // Detect read-first docs
    const readFirstCandidates = ['AGENTS.md', 'CONVENTIONS.md', 'README.md', 'CONTRIBUTING.md',
        'docs/TESTING.md', 'docs/BUSINESS_LOGIC.md', 'docs/FEATURES.md', 'docs/ERRORS.md', 'docs/ARCHITECTURE.md'];
    const readFirstDocs = readFirstCandidates.filter(f => fs.existsSync(path.join(absPath, f)));

    // Detect behavior signals
    const behaviorSignals: string[] = [];
    const sampleFiles = allFiles.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.vue', '.svelte'].includes(ext);
    }).slice(0, 500); // Sample for performance

    for (const [signal, keywords] of Object.entries(BEHAVIOR_KEYWORDS)) {
        let found = false;
        for (const file of sampleFiles) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                if (keywords.some(kw => content.includes(kw))) { found = true; break; }
            } catch { /* skip */ }
        }
        if (found) behaviorSignals.push(signal);
    }
    onProgress?.(`Behavior signals: ${behaviorSignals.join(', ') || 'none'}`);

    // Build architecture summary
    const archParts: string[] = [];
    if (detectedFrameworks.includes('FastAPI')) archParts.push('FastAPI backend');
    else if (detectedFrameworks.includes('Django')) archParts.push('Django backend');
    else if (detectedFrameworks.includes('Flask')) archParts.push('Flask backend');
    else if (detectedFrameworks.includes('Express')) archParts.push('Express backend');
    else if (detectedFrameworks.includes('NestJS')) archParts.push('NestJS backend');
    else if (detectedFrameworks.includes('Spring')) archParts.push('Spring backend');
    else if (detectedFrameworks.includes('Rails')) archParts.push('Rails backend');
    else if (detectedFrameworks.includes('Laravel')) archParts.push('Laravel backend');

    if (detectedFrameworks.includes('React') && detectedFrameworks.includes('Vite')) archParts.push('React/Vite frontend');
    else if (detectedFrameworks.includes('React')) archParts.push('React frontend');
    else if (detectedFrameworks.includes('Next.js')) archParts.push('Next.js frontend');
    else if (detectedFrameworks.includes('Vue')) archParts.push('Vue frontend');
    else if (detectedFrameworks.includes('Svelte')) archParts.push('Svelte frontend');
    else if (detectedFrameworks.includes('Angular')) archParts.push('Angular frontend');

    const architecture = archParts.length > 0
        ? `${archParts.join(' + ')} (full-stack web application).`
        : `${Object.keys(langCounts).slice(0, 3).join('/')} project.`;

    // Detect validation commands
    const validationCommands: RepoProfile['validationCommands'] = {};
    if (fs.existsSync(path.join(absPath, 'backend', 'requirements.txt')) || fs.existsSync(path.join(absPath, 'backend', 'pyproject.toml'))) {
        validationCommands.backend = 'cd backend && python -m pytest -q';
    } else if (fs.existsSync(path.join(absPath, 'Cargo.toml'))) {
        validationCommands.backend = 'cargo test';
    } else if (fs.existsSync(path.join(absPath, 'pom.xml'))) {
        validationCommands.backend = 'mvn test';
    }
    if (fs.existsSync(path.join(absPath, 'frontend', 'package.json'))) {
        validationCommands.frontend = 'cd frontend && npm run lint && npm run build';
    } else if (fs.existsSync(path.join(absPath, 'package.json')) && !fs.existsSync(path.join(absPath, 'backend'))) {
        validationCommands.frontend = 'npm run lint && npm run build';
    }
    if (fs.existsSync(path.join(absPath, 'frontend', 'playwright.config.js')) || fs.existsSync(path.join(absPath, 'frontend', 'playwright.config.ts'))) {
        validationCommands.e2e = 'cd frontend && npx playwright test';
    } else if (fs.existsSync(path.join(absPath, 'playwright.config.js')) || fs.existsSync(path.join(absPath, 'playwright.config.ts'))) {
        validationCommands.e2e = 'npx playwright test';
    }

    const profile: RepoProfile = {
        name: repoName,
        rootPath: absPath,
        architecture,
        languages: langCounts,
        frameworks: detectedFrameworks,
        keyRoots,
        readFirstDocs,
        behaviorSignals,
        totalFiles: allFiles.length,
        validationCommands,
        skillCatalog: { total: 0, sources: 0, indexPath: '' },
        scannedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, profile, [`repo:${absPath}`], 10 * 60 * 1000);
    onProgress?.('Scan complete');
    return profile;
}

// ── Helpers ──────────────────────────────────────────────────
function findFileByGlob(root: string, pattern: string, allFiles: string[]): string | null {
    const filename = pattern.replace('**/', '');
    const match = allFiles.find(f => f.endsWith(filename));
    return match ?? null;
}

/** Read key file contents from repo for AI context. */
export async function readRepoContext(repoPath: string, maxFiles = 30): Promise<string> {
    const profile = await scanRepo(repoPath);
    const parts: string[] = [`# Repository: ${profile.name}\n`, `Architecture: ${profile.architecture}\n`];

    // Read the read-first docs
    for (const doc of profile.readFirstDocs.slice(0, 5)) {
        const fullPath = path.join(repoPath, doc);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            parts.push(`\n## ${doc}\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\`\n`);
        } catch { /* skip */ }
    }

    // Read key config files
    const configFiles = ['package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'docker-compose.yml'];
    for (const cf of configFiles) {
        const fullPath = path.join(repoPath, cf);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                parts.push(`\n## ${cf}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\`\n`);
            } catch { /* skip */ }
        }
    }

    return parts.join('\n');
}

/** Get git status of repo. */
export function getGitStatus(repoPath: string): string {
    try {
        return execSync('git status --short', { cwd: repoPath, encoding: 'utf-8' });
    } catch {
        return '';
    }
}
