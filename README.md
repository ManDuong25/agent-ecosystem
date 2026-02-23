# Agent Ecosystem

**A standalone TypeScript web dashboard for managing AI agent configurations, skills, and spec-driven development across any repository.**

Scans your repository, generates standardized agent bridge files for **all major AI platforms**, manages skills, runs spec-driven workflows, and provides a Chrome-based AI Engineer Loop.

## Features

| Feature | Description |
|---|---|
| **Repo Setup** | Paste a repo path ? auto-scan structure, generate agent bridge files |
| **Skill Management** | Add GitHub skill repos, auto-pull, index, and update |
| **AI Analysis** | Gemini 3.1 Pro via ProxyPal analyzes your entire codebase |
| **Spec Workflow** | EARS requirements ? Mermaid design ? TDD tasks, all AI-powered |
| **Bug Tracker** | Report bugs, get AI analysis, track resolution |
| **AI Engineer Loop** | Detect file changes ? send to Gemini/ChatGPT via Chrome ? get review |
| **Real-time Dashboard** | WebSocket-powered live stats, file changes, and progress |
| **Session Caching** | TTL + tag-based cache invalidation for fast operations |

## Supported Agents

| Agent | Config Generated |
|---|---|
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/prompts/*` |
| **Claude** (Anthropic) | `CLAUDE.md` |
| **Codex** (OpenAI) | `.codex/prompts/auto-execute.prompt.md` |
| **Gemini** (Google) | `GEMINI.md` |

## Quick Start

```bash
# Install dependencies
npm install

# Start development (server + client concurrently)
npm run dev

# Open in browser
# ? http://localhost:5173
```

## Architecture

```
Express (port 4927)      React/Vite (port 5173 dev)
+-- /api/repo            +-- Dashboard
+-- /api/skills          +-- Repo Setup
+-- /api/specs           +-- Skills
+-- /api/ai              +-- Specifications
+-- /api/engineer        +-- AI Engineer
+-- Socket.io            +-- Bug Tracker
```

### Tech Stack

- **Backend**: Express.js + TypeScript + Socket.io
- **Frontend**: React 19 + Vite 6 + TailwindCSS + React Router
- **AI**: Gemini 3.1 Pro via ProxyPal proxy (OpenAI-compatible)
- **Chrome**: Puppeteer for AI Engineer Loop automation
- **File Watching**: chokidar for real-time change detection
- **Git**: simple-git for skill repo management

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server + client in dev mode |
| `npm run dev:server` | Start Express server only |
| `npm run dev:client` | Start Vite client only |
| `npm run build` | Build client + compile server |
| `npm start` | Run production build |

## Configuration

### ProxyPal (AI)
The app connects to a local ProxyPal instance for AI features:
- URL: `http://localhost:8317`
- Model: `gemini-3.1-pro-high`
- Configure via the Settings page or `PUT /api/ai/config`

### Chrome Bridge
For the AI Engineer Loop, Chrome is launched with Puppeteer:
- Custom Chrome profile path (preserves login sessions)
- Targets: Gemini (`gemini.google.com`) or ChatGPT (`chatgpt.com`)
- Configure via the AI Engineer settings panel

## Project Structure

```
src/
+-- shared/types.ts          # Shared TypeScript interfaces
+-- server/
¦   +-- index.ts             # Express + Socket.io entry
¦   +-- routes/              # API route handlers
¦   +-- services/            # Business logic
¦       +-- repo-scanner.ts  # Repo structure analysis
¦       +-- template-engine.ts # Agent bridge file generation
¦       +-- skill-manager.ts # GitHub skill management
¦       +-- spec-engine.ts   # Spec-driven workflow
¦       +-- ai-client.ts     # Gemini AI integration
¦       +-- file-watcher.ts  # chokidar file watching
¦       +-- chrome-bridge.ts # Puppeteer Chrome automation
¦       +-- cache.ts         # Session-based caching
+-- client/
    +-- App.tsx              # React Router setup
    +-- pages/               # Page components
    +-- components/          # Shared UI components
    +-- lib/                 # API client, WebSocket, store
templates/                   # .hbs agent bridge templates
```

## License

MIT