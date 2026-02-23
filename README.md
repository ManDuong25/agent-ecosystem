# agent-ecosystem

**One command. Any repo. Every AI agent gets the same standardized context.**

`aeco` is a cross-platform CLI (single binary, zero dependencies) that scans any repository, generates agent instructions for **all major AI platforms**, and enforces a spec-driven development workflow.

## Supported Agents

| Agent | Config Generated |
|---|---|
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/prompts/*`, `.github/agents/*` |
| **Claude** (Anthropic) | `CLAUDE.md` |
| **Codex** (OpenAI) | `.codex/prompts/auto-execute.prompt.md` |
| **Gemini** (Google) | `GEMINI.md` |
| **Cursor** | Skill targets synced to `~/.cursor/skills` |
| **Kiro** (Amazon) | Skill targets synced to `~/.kiro/skills` |
| **Antigravity** | Skill targets synced to `~/.gemini/antigravity/skills` |

## Install

### Go install (recommended)
```bash
go install github.com/sickn33/agent-ecosystem/cmd/aeco@latest
```

### Pre-built binaries
```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/sickn33/agent-ecosystem/main/scripts/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/sickn33/agent-ecosystem/main/scripts/install.ps1 | iex
```

### From source
```bash
git clone https://github.com/sickn33/agent-ecosystem.git
cd agent-ecosystem
go build -o bin/aeco ./cmd/aeco
```

## Quick Start

```bash
# In any repository:
cd your-project

# One command does everything
aeco ready --quick

# Or step by step:
aeco init            # Initialize config + templates
aeco profile         # Scan repo structure
aeco bootstrap       # Fetch skill sources
aeco sync --apply    # Build skill index
aeco export          # Generate all agent bridge files
```

After `aeco ready`, your repo will have:
- `AGENTS.md` — unified agent operating contract
- `CLAUDE.md` — Claude-specific instructions  
- `GEMINI.md` — Gemini-specific instructions
- `.github/copilot-instructions.md` — Copilot context
- `.github/prompts/` — skill router + spec-kit prompts
- `.github/instructions/` — backend/frontend scoped rules
- `.codex/prompts/` — Codex auto-execute prompt
- `docs/ai/repo-profile.json` — machine-readable repo profile
- `docs/ai/skills-index.md` — searchable skill catalog

## How It Works

```
┌─────────────────────────────────────────────────┐
│                  aeco ready                      │
├─────────────────────────────────────────────────┤
│  1. PROFILE   Scan entire repo                  │
│     → detect languages, frameworks, structure    │
│     → identify validation commands               │
│     → find behavior-sensitive domains            │
│                                                  │
│  2. BOOTSTRAP  Clone skill sources              │
│     → openai/skills (curated)                    │
│     → antigravity-awesome-skills (community)     │
│                                                  │
│  3. SYNC      Build unified skill index          │
│     → namespace skills (oa-*, ag-*)              │
│     → distribute to agent targets                │
│                                                  │
│  4. EXPORT    Render agent bridge files          │
│     → inject repo profile into templates         │
│     → generate per-agent instruction files       │
│     → write spec-driven workflow prompts         │
└─────────────────────────────────────────────────┘
```

## Commands

| Command | Description |
|---|---|
| `aeco ready` | Full zero-setup pipeline (profile → bootstrap → sync → export) |
| `aeco profile` | Scan repo and write `docs/ai/repo-profile.json` |
| `aeco doctor` | Check system tools and hub health |
| `aeco bootstrap` | Clone/fetch skill sources into `~/.agent-skills-hub` |
| `aeco sync --apply` | Build skill index and sync to agent targets |
| `aeco export` | Render all agent bridge template files |
| `aeco update --source all --ref main` | Track latest upstream skill refs |
| `aeco init` | Initialize agent-ecosystem in current repo |
| `aeco install --target /path/to/repo` | Copy kit into another repo |

## Cross-Platform

`aeco` is a single Go binary that runs on:
- **Windows** (amd64, arm64)
- **macOS** (amd64, arm64 / Apple Silicon)
- **Linux** (amd64, arm64)

No runtime dependencies. No Python. No Node. Just `git` and the binary.

## Configuration

The manifest file (`tools/agent-ecosystem/skills.manifest.yaml`) controls:
- **Skill sources**: which repos to pull skills from
- **Namespace prefixes**: `oa-*` for OpenAI, `ag-*` for community
- **Agent targets**: where to sync skills on disk
- **Bridge mode**: how Copilot instructions are generated
- **Spec workflow**: Spec-Kit integration settings
- **Security**: whether to allow executable files from skills

## Templates

Agent bridge files are generated from Handlebars-style templates in `assets/templates/`. Each template uses `{{PLACEHOLDER}}` tokens that are replaced with the repo profile data.

To customize outputs:
1. Run `aeco init` to extract templates into your repo
2. Edit templates in `tools/agent-ecosystem/templates/`
3. Run `aeco export` to regenerate

## Workflow: Spec-Driven Development

`aeco` integrates with [Spec-Kit](https://github.com/github/spec-kit) for structured development:

```
/speckit.specify  →  Create feature spec
/speckit.plan     →  Architecture + constraints
/speckit.tasks    →  Break into atomic tasks
/speckit.implement →  Execute task-by-task with validation
```

Every prompt includes the repo's specific validation commands and behavior constraints.

## Contributing

```bash
# Clone and build
git clone https://github.com/sickn33/agent-ecosystem.git
cd agent-ecosystem
go build ./cmd/aeco
go test ./...

# Release (tagged)
git tag v0.1.0
git push origin v0.1.0
# → GitHub Actions builds binaries for all platforms
```

## License

MIT
