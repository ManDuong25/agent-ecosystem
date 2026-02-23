/**
 * TemplateEngine – renders .hbs templates into agent bridge files.
 * Uses simple {{KEY}} substitution (no Handlebars dependency needed).
 */

import fs from 'fs';
import path from 'path';
import type { RepoProfile } from '../../shared/types.js';

// ── Output file mapping ──────────────────────────────────────
const OUTPUT_MAP: Record<string, string> = {
  'agents.md.hbs':                        'AGENTS.md',
  'claude.md.hbs':                        'CLAUDE.md',
  'gemini.md.hbs':                        'GEMINI.md',
  'copilot-instructions.md.hbs':          '.github/copilot-instructions.md',
  'copilot-agent-instructions.md.hbs':    '.github/copilot-agent-instructions.md',
  'backend.instructions.md.hbs':          '.github/instructions/backend.instructions.md',
  'frontend.instructions.md.hbs':         '.github/instructions/frontend.instructions.md',
  'codex-auto-execute.prompt.md.hbs':     '.codex/auto-execute.prompt.md',
  'find-skill.prompt.md.hbs':             '.github/prompts/find-skill.prompt.md',
  'use-skill.prompt.md.hbs':              '.github/prompts/use-skill.prompt.md',
  'speckit-sdd.prompt.md.hbs':            '.github/prompts/speckit-sdd.prompt.md',
  'speckit-implement.prompt.md.hbs':      '.github/prompts/speckit-implement.prompt.md',
};

// ── Template directory (relative to project root) ────────────
function getTemplatesDir(): string {
  // In development: templates/ in project root
  // After build: same relative path
  const candidates = [
    path.join(process.cwd(), 'templates'),
    path.join(__dirname, '..', '..', '..', 'templates'),
    path.join(__dirname, '..', '..', 'templates'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error('Templates directory not found');
}

// ── Build template variables ─────────────────────────────────
export function buildTemplateVars(profile: RepoProfile): Record<string, string> {
  return {
    REPO_NAME:            profile.name,
    ARCHITECTURE:         profile.architecture,
    KEY_ROOTS:            profile.keyRoots.join(', '),
    READ_FIRST_DOCS:      profile.readFirstDocs.join(', '),
    PRESERVE_BEHAVIORS:   profile.behaviorSignals.join(', '),
    VALIDATION_BACKEND:   profile.validationCommands.backend ?? '',
    VALIDATION_FRONTEND:  profile.validationCommands.frontend ?? '',
    VALIDATION_E2E:       profile.validationCommands.e2e ?? '',
    READY_COMMAND:         'aeco ready --quick',
    SPECFLOW_SECTION:      buildSpecflowSection(),
    SKILL_CATALOG_TOTAL:  String(profile.skillCatalog.total),
    SKILL_CATALOG_SOURCES: String(profile.skillCatalog.sources),
    SKILL_INDEX_PATH:     profile.skillCatalog.indexPath,
    GENERATED_AT:         new Date().toISOString(),
    TOTAL_FILES:          String(profile.totalFiles),
    LANGUAGES:            Object.entries(profile.languages)
                            .sort((a, b) => b[1] - a[1])
                            .map(([l, c]) => `${l}(${c})`)
                            .join(', '),
    FRAMEWORKS:           profile.frameworks.join(', '),
  };
}

function buildSpecflowSection(): string {
  return `## Spec-Driven Workflow (Spec-Kit)
- This repo supports a multi-agent SDD flow via Agent Ecosystem web dashboard.
- Phases: specify → requirements → design → tasks → implement
- Requirements use EARS format (WHEN/IF/THEN statements)
- Design includes Mermaid diagrams for visualization
- Tasks focus on test-driven development`;
}

// ── Render a single template ─────────────────────────────────
export function renderTemplate(templateContent: string, vars: Record<string, string>): string {
  let result = templateContent;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// ── Render all templates and write to repo ───────────────────
export async function renderAndWriteAll(
  repoPath: string,
  profile: RepoProfile,
  onProgress?: (msg: string) => void
): Promise<string[]> {
  const templatesDir = getTemplatesDir();
  const vars = buildTemplateVars(profile);
  const writtenFiles: string[] = [];

  const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.hbs'));
  onProgress?.(`Found ${templateFiles.length} templates`);

  for (const templateFile of templateFiles) {
    const outputRelPath = OUTPUT_MAP[templateFile];
    if (!outputRelPath) {
      onProgress?.(`Skipping unknown template: ${templateFile}`);
      continue;
    }

    const templateContent = fs.readFileSync(path.join(templatesDir, templateFile), 'utf-8');
    const rendered = renderTemplate(templateContent, vars);
    const outputPath = path.join(repoPath, outputRelPath);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, rendered, 'utf-8');
    writtenFiles.push(outputRelPath);
    onProgress?.(`Wrote ${outputRelPath}`);
  }

  return writtenFiles;
}

// ── Get list of available templates ──────────────────────────
export function listTemplates(): string[] {
  try {
    const dir = getTemplatesDir();
    return fs.readdirSync(dir).filter(f => f.endsWith('.hbs'));
  } catch {
    return [];
  }
}

// ── Bulk load all templates (for template context) ───────────
export function loadAllTemplates(): Record<string, string> {
  const dir = getTemplatesDir();
  const result: Record<string, string> = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.hbs'))) {
    result[f] = fs.readFileSync(path.join(dir, f), 'utf-8');
  }
  return result;
}
