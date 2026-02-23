/**
 * SkillManager – clones skill repos from GitHub, indexes them, manages updates.
 */

import fs from 'fs';
import path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { v4 as uuid } from 'uuid';
import type { Skill, SkillEntry, SkillIndex } from '../../shared/types.js';

const HUB_DIR = path.join(process.cwd(), 'hub');
const SKILLS_DB = path.join(HUB_DIR, 'skills.json');

function ensureHub() {
    fs.mkdirSync(HUB_DIR, { recursive: true });
}

function loadSkills(): Skill[] {
    if (!fs.existsSync(SKILLS_DB)) return [];
    try {
        return JSON.parse(fs.readFileSync(SKILLS_DB, 'utf-8'));
    } catch {
        return [];
    }
}

function saveSkills(skills: Skill[]): void {
    ensureHub();
    fs.writeFileSync(SKILLS_DB, JSON.stringify(skills, null, 2), 'utf-8');
}

/** Extract repo name from GitHub URL. */
function repoNameFromUrl(url: string): string {
    const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
    return cleaned.split('/').pop() || 'unknown';
}

/** Validate a GitHub URL. */
function isValidGitHubUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/.test(url);
}

// ── Public API ───────────────────────────────────────────────

export async function addSkill(
    githubUrl: string,
    onProgress?: (msg: string) => void
): Promise<Skill> {
    if (!isValidGitHubUrl(githubUrl)) {
        throw new Error(`Invalid GitHub URL: ${githubUrl}`);
    }

    ensureHub();
    const existing = loadSkills();
    const dup = existing.find(s => s.githubUrl === githubUrl);
    if (dup) throw new Error(`Skill already added: ${dup.name}`);

    const name = repoNameFromUrl(githubUrl);
    const localPath = path.join(HUB_DIR, name);
    const skill: Skill = {
        id: uuid(),
        name,
        githubUrl,
        localPath,
        description: '',
        lastUpdated: new Date().toISOString(),
        status: 'cloned',
        skillCount: 0,
    };

    onProgress?.(`Cloning ${githubUrl}...`);

    if (fs.existsSync(localPath)) {
        // Already cloned, just fetch
        const git: SimpleGit = simpleGit(localPath);
        await git.fetch();
        await git.pull();
        onProgress?.('Updated existing clone');
    } else {
        const git: SimpleGit = simpleGit();
        await git.clone(githubUrl, localPath, ['--depth', '1']);
        onProgress?.('Clone complete');
    }

    // Count skills (look for SKILL.md or specific patterns)
    skill.skillCount = countSkills(localPath);
    skill.description = readSkillDescription(localPath);
    skill.status = 'ready';

    existing.push(skill);
    saveSkills(existing);
    onProgress?.(`Added skill: ${name} (${skill.skillCount} skills found)`);
    return skill;
}

export async function updateSkill(
    skillId: string,
    onProgress?: (msg: string) => void
): Promise<Skill> {
    const skills = loadSkills();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) throw new Error(`Skill not found: ${skillId}`);

    skill.status = 'updating';
    saveSkills(skills);

    try {
        onProgress?.(`Updating ${skill.name}...`);
        const git: SimpleGit = simpleGit(skill.localPath);
        await git.fetch();
        await git.pull();
        skill.skillCount = countSkills(skill.localPath);
        skill.lastUpdated = new Date().toISOString();
        skill.status = 'ready';
        onProgress?.(`Updated: ${skill.name}`);
    } catch (err: any) {
        skill.status = 'error';
        onProgress?.(`Error updating ${skill.name}: ${err.message}`);
    }

    saveSkills(skills);
    return skill;
}

export async function updateAllSkills(
    onProgress?: (msg: string) => void
): Promise<Skill[]> {
    const skills = loadSkills();
    for (const skill of skills) {
        await updateSkill(skill.id, onProgress);
    }
    return loadSkills();
}

export function listSkills(): Skill[] {
    return loadSkills();
}

export function removeSkill(skillId: string): void {
    const skills = loadSkills();
    const idx = skills.findIndex(s => s.id === skillId);
    if (idx < 0) throw new Error(`Skill not found: ${skillId}`);

    const skill = skills[idx];
    // Remove local directory
    if (fs.existsSync(skill.localPath)) {
        fs.rmSync(skill.localPath, { recursive: true, force: true });
    }
    skills.splice(idx, 1);
    saveSkills(skills);
}

export function buildSkillIndex(): SkillIndex {
    ensureHub();
    const skills = loadSkills();
    const allEntries: SkillEntry[] = [];

    for (const skill of skills) {
        if (!fs.existsSync(skill.localPath)) continue;
        walkForSkills(skill.localPath, skill.name, allEntries);
    }

    // Group entries by namespace/category
    const entries: Record<string, SkillEntry[]> = {};
    for (const entry of allEntries) {
        const key = entry.namespace || 'default';
        if (!entries[key]) entries[key] = [];
        entries[key].push(entry);
    }

    const index: SkillIndex = {
        totalSkills: allEntries.length,
        categories: Object.keys(entries),
        entries,
        builtAt: new Date().toISOString(),
    };

    // Write index to hub
    fs.writeFileSync(path.join(HUB_DIR, 'skills-index.json'), JSON.stringify(index, null, 2), 'utf-8');
    return index;
}

// ── Helpers ──────────────────────────────────────────────────

function countSkills(dir: string): number {
    let count = 0;
    function walk(d: string) {
        try {
            for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                if (entry.isDirectory()) walk(path.join(d, entry.name));
                else if (entry.name === 'SKILL.md' || entry.name === 'skill.yaml' || entry.name === 'skill.yml') count++;
            }
        } catch { /* skip */ }
    }
    walk(dir);
    return count;
}

function readSkillDescription(dir: string): string {
    const readme = path.join(dir, 'README.md');
    if (fs.existsSync(readme)) {
        try {
            const content = fs.readFileSync(readme, 'utf-8');
            // Extract first paragraph
            const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
            return lines.slice(0, 3).join(' ').slice(0, 200);
        } catch { /* skip */ }
    }
    return '';
}

function walkForSkills(dir: string, source: string, entries: SkillEntry[]) {
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkForSkills(fullPath, source, entries);
            } else if (entry.name === 'SKILL.md') {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const nameMatch = content.match(/^#\s+(.+)/m);
                const descMatch = content.match(/^(?!#)(.+)/m);
                const namespace = path.basename(path.dirname(fullPath));
                entries.push({
                    name: nameMatch?.[1] ?? namespace,
                    namespace,
                    path: fullPath,
                    source,
                    description: descMatch?.[1]?.trim() ?? '',
                });
            }
        }
    } catch { /* skip */ }
}
