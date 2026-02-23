/**
 * SpecEngine – manages the Spec-Driven Development workflow.
 * Specs are stored as JSON files in the target repo under specs/<spec-id>/.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { Spec, SpecTask, SpecPhase, Bug } from '../../shared/types.js';
import * as ai from './ai-client.js';
import { readRepoContext } from './repo-scanner.js';

// ── Helpers ──────────────────────────────────────────────────

function specsDir(repoPath: string): string {
  return path.join(repoPath, 'specs');
}

function specDir(repoPath: string, specId: string): string {
  return path.join(specsDir(repoPath), specId);
}

function specFile(repoPath: string, specId: string): string {
  return path.join(specDir(repoPath, specId), 'spec.json');
}

function loadSpec(repoPath: string, specId: string): Spec {
  const file = specFile(repoPath, specId);
  if (!fs.existsSync(file)) throw new Error(`Spec not found: ${specId}`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function saveSpec(repoPath: string, spec: Spec): void {
  const dir = specDir(repoPath, spec.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(specFile(repoPath, spec.id), JSON.stringify(spec, null, 2), 'utf-8');
}

function writeDocument(repoPath: string, specId: string, filename: string, content: string): void {
  const dir = specDir(repoPath, specId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
}

// ── Public API ───────────────────────────────────────────────

/** Create a new specification. */
export async function createSpec(repoPath: string, name: string, description: string): Promise<Spec> {
  const spec: Spec = {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    description,
    status: 'specify',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    repoPath,
    tasks: [],
    bugs: [],
  };

  saveSpec(repoPath, spec);
  return spec;
}

/** Generate requirements using AI (EARS format). */
export async function generateRequirements(
  repoPath: string,
  specId: string,
  onStream?: (chunk: string) => void
): Promise<Spec> {
  const spec = loadSpec(repoPath, specId);
  const repoContext = await readRepoContext(repoPath);
  const messages = ai.buildRequirementsPrompt(spec.name, spec.description, repoContext);

  let fullContent = '';
  for await (const chunk of ai.chatStream(messages)) {
    if (chunk.content) {
      fullContent += chunk.content;
      onStream?.(chunk.content);
    }
  }

  spec.requirements = fullContent;
  spec.status = 'requirements';
  spec.updatedAt = new Date().toISOString();
  saveSpec(repoPath, spec);
  writeDocument(repoPath, specId, 'requirements.md', fullContent);
  return spec;
}

/** Generate design document using AI (with Mermaid diagrams). */
export async function generateDesign(
  repoPath: string,
  specId: string,
  onStream?: (chunk: string) => void
): Promise<Spec> {
  const spec = loadSpec(repoPath, specId);
  if (!spec.requirements) throw new Error('Requirements must be generated first');

  const repoContext = await readRepoContext(repoPath);
  const messages = ai.buildDesignPrompt(spec.requirements, repoContext);

  let fullContent = '';
  for await (const chunk of ai.chatStream(messages)) {
    if (chunk.content) {
      fullContent += chunk.content;
      onStream?.(chunk.content);
    }
  }

  spec.design = fullContent;
  spec.status = 'design';
  spec.updatedAt = new Date().toISOString();
  saveSpec(repoPath, spec);
  writeDocument(repoPath, specId, 'design.md', fullContent);
  return spec;
}

/** Generate implementation tasks using AI (TDD-focused). */
export async function generateTasks(
  repoPath: string,
  specId: string,
  onStream?: (chunk: string) => void
): Promise<Spec> {
  const spec = loadSpec(repoPath, specId);
  if (!spec.design) throw new Error('Design must be generated first');

  const repoContext = await readRepoContext(repoPath);
  const messages = ai.buildTasksPrompt(spec.design, repoContext);

  let fullContent = '';
  for await (const chunk of ai.chatStream(messages)) {
    if (chunk.content) {
      fullContent += chunk.content;
      onStream?.(chunk.content);
    }
  }

  // Parse tasks from AI response
  spec.tasks = parseTasksFromMarkdown(fullContent, specId);
  spec.status = 'tasks';
  spec.updatedAt = new Date().toISOString();
  saveSpec(repoPath, spec);
  writeDocument(repoPath, specId, 'tasks.md', fullContent);
  return spec;
}

/** Update a task's status. */
export function updateTask(repoPath: string, specId: string, taskId: string, status: SpecTask['status'], output?: string): Spec {
  const spec = loadSpec(repoPath, specId);
  const task = spec.tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  task.status = status;
  if (output) task.output = output;
  spec.updatedAt = new Date().toISOString();

  // Auto-advance phase if all tasks done
  if (spec.tasks.every(t => t.status === 'done')) {
    spec.status = 'done';
  } else if (spec.tasks.some(t => t.status === 'in-progress' || t.status === 'done')) {
    spec.status = 'implement';
  }

  saveSpec(repoPath, spec);
  return spec;
}

/** Get the current status of a spec. */
export function getSpecStatus(repoPath: string, specId: string): Spec {
  return loadSpec(repoPath, specId);
}

/** List all specs for a repo. */
export function listSpecs(repoPath: string): Spec[] {
  const dir = specsDir(repoPath);
  if (!fs.existsSync(dir)) return [];

  const specs: Spec[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, 'spec.json');
    if (fs.existsSync(file)) {
      try {
        specs.push(JSON.parse(fs.readFileSync(file, 'utf-8')));
      } catch { /* skip corrupt */ }
    }
  }
  return specs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Delete a spec. */
export function deleteSpec(repoPath: string, specId: string): void {
  const dir = specDir(repoPath, specId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── Bug workflow ─────────────────────────────────────────────

export function createBug(repoPath: string, specId: string | undefined, bug: Omit<Bug, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Bug {
  const newBug: Bug = {
    ...bug,
    id: uuid(),
    specId,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (specId) {
    const spec = loadSpec(repoPath, specId);
    spec.bugs.push(newBug);
    saveSpec(repoPath, spec);
  }

  // Also save to global bugs file
  const bugsFile = path.join(specsDir(repoPath), 'bugs.json');
  const bugs: Bug[] = fs.existsSync(bugsFile) ? JSON.parse(fs.readFileSync(bugsFile, 'utf-8')) : [];
  bugs.push(newBug);
  fs.mkdirSync(specsDir(repoPath), { recursive: true });
  fs.writeFileSync(bugsFile, JSON.stringify(bugs, null, 2), 'utf-8');
  return newBug;
}

export function updateBugStatus(repoPath: string, bugId: string, status: Bug['status'], resolution?: string): Bug {
  const bugsFile = path.join(specsDir(repoPath), 'bugs.json');
  const bugs: Bug[] = fs.existsSync(bugsFile) ? JSON.parse(fs.readFileSync(bugsFile, 'utf-8')) : [];
  const bug = bugs.find(b => b.id === bugId);
  if (!bug) throw new Error(`Bug not found: ${bugId}`);

  bug.status = status;
  if (resolution) bug.resolution = resolution;
  bug.updatedAt = new Date().toISOString();
  fs.writeFileSync(bugsFile, JSON.stringify(bugs, null, 2), 'utf-8');
  return bug;
}

export function listBugs(repoPath: string): Bug[] {
  const bugsFile = path.join(specsDir(repoPath), 'bugs.json');
  if (!fs.existsSync(bugsFile)) return [];
  return JSON.parse(fs.readFileSync(bugsFile, 'utf-8'));
}

export async function analyzeBug(repoPath: string, bugId: string, onStream?: (chunk: string) => void): Promise<string> {
  const bugs = listBugs(repoPath);
  const bug = bugs.find(b => b.id === bugId);
  if (!bug) throw new Error(`Bug not found: ${bugId}`);

  const repoContext = await readRepoContext(repoPath);
  const bugDesc = `Title: ${bug.title}\nDescription: ${bug.description}\nSteps: ${bug.stepsToReproduce}\nSeverity: ${bug.severity}`;
  const messages = ai.buildBugAnalysisPrompt(bugDesc, repoContext);

  let result = '';
  for await (const chunk of ai.chatStream(messages)) {
    if (chunk.content) {
      result += chunk.content;
      onStream?.(chunk.content);
    }
  }
  return result;
}

// ── Optimization contexts ────────────────────────────────────

export async function getSteeringContext(repoPath: string): Promise<string> {
  const repoContext = await readRepoContext(repoPath);
  const specs = listSpecs(repoPath);
  const activeSpec = specs.find(s => s.status !== 'done');

  return `# Steering Context
${repoContext}

## Active Specifications: ${specs.length}
${activeSpec ? `Current: ${activeSpec.name} (status: ${activeSpec.status})` : 'No active specs'}

## Guidelines
- Follow EARS notation for requirements
- Use Mermaid for all diagrams
- Test-driven development for all tasks
- Atomic commits per task`;
}

export async function getSpecContext(repoPath: string, specId?: string): Promise<string> {
  if (specId) {
    const spec = loadSpec(repoPath, specId);
    return `# Spec Context: ${spec.name}
Status: ${spec.status}
Requirements: ${spec.requirements ? 'Generated' : 'Pending'}
Design: ${spec.design ? 'Generated' : 'Pending'}
Tasks: ${spec.tasks.length} (${spec.tasks.filter(t => t.status === 'done').length} done)
Bugs: ${spec.bugs.length}

${spec.requirements ? `## Requirements\n${spec.requirements}\n` : ''}
${spec.design ? `## Design\n${spec.design}\n` : ''}`;
  }

  const specs = listSpecs(repoPath);
  return specs.map(s => `- ${s.name} [${s.status}] (${s.tasks.filter(t => t.status === 'done').length}/${s.tasks.length} tasks)`).join('\n');
}

// ── Task parser ──────────────────────────────────────────────

function parseTasksFromMarkdown(markdown: string, specId: string): SpecTask[] {
  const tasks: SpecTask[] = [];
  // Match numbered items like "### Task 1:" or "## 1." or "**1.**"
  const taskRegex = /(?:^|\n)(?:#{1,4}\s*)?(?:Task\s+)?(\d+)[\.:]\s*\**([^\n*]+)\**/gi;
  let match: RegExpExecArray | null;

  while ((match = taskRegex.exec(markdown)) !== null) {
    const idx = match.index;
    const nextMatch = taskRegex.exec(markdown);
    const end = nextMatch ? nextMatch.index : markdown.length;
    taskRegex.lastIndex = nextMatch ? nextMatch.index : markdown.length;

    const body = markdown.slice(idx, end);
    const filesMatch = body.match(/files?[:\s]*([^\n]+)/i);
    const files = filesMatch
      ? filesMatch[1].split(/[,;]/).map(f => f.trim().replace(/^[`*]+|[`*]+$/g, '')).filter(Boolean)
      : [];

    tasks.push({
      id: `task-${tasks.length + 1}`,
      specId,
      title: match[2].trim(),
      description: body.trim(),
      status: 'pending',
      testFirst: body.toLowerCase().includes('test') && body.toLowerCase().includes('first'),
      files,
    });

    if (nextMatch) {
      taskRegex.lastIndex = nextMatch.index;
    }
  }

  // Fallback if regex didn't match: split by numbered lines
  if (tasks.length === 0) {
    const lines = markdown.split('\n');
    let currentTitle = '';
    let currentBody = '';

    for (const line of lines) {
      const numMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
      if (numMatch) {
        if (currentTitle) {
          tasks.push({
            id: `task-${tasks.length + 1}`,
            specId,
            title: currentTitle,
            description: currentBody.trim(),
            status: 'pending',
            testFirst: currentBody.toLowerCase().includes('test'),
            files: [],
          });
        }
        currentTitle = numMatch[2].replace(/\*+/g, '').trim();
        currentBody = line + '\n';
      } else if (currentTitle) {
        currentBody += line + '\n';
      }
    }
    if (currentTitle) {
      tasks.push({
        id: `task-${tasks.length + 1}`,
        specId,
        title: currentTitle,
        description: currentBody.trim(),
        status: 'pending',
        testFirst: currentBody.toLowerCase().includes('test'),
        files: [],
      });
    }
  }

  return tasks;
}
