/**
 * Repo routes – scan repo, setup agent files, optimization contexts.
 */

import { Router, Request, Response } from 'express';
import { scanRepo, readRepoContext } from '../services/repo-scanner.js';
import { renderAndWriteAll, buildTemplateVars, listTemplates, loadAllTemplates } from '../services/template-engine.js';
import { startWatching, stopWatching, getChangedFiles, clearChanges, isWatching } from '../services/file-watcher.js';
import { getSteeringContext, getSpecContext } from '../services/spec-engine.js';
import { getIO } from '../index.js';

const router = Router();

/** POST /api/repo/scan – scan a repository */
router.post('/scan', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        const io = getIO();
        const profile = await scanRepo(repoPath, (msg) => {
            io?.emit('ws-event', { type: 'scan-progress', payload: msg });
        });

        res.json({ ok: true, data: profile });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/repo/setup – scan + render templates into repo */
router.post('/setup', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        const io = getIO();
        const profile = await scanRepo(repoPath, (msg) => {
            io?.emit('ws-event', { type: 'scan-progress', payload: msg });
        });

        const files = await renderAndWriteAll(repoPath, profile, (msg) => {
            io?.emit('ws-event', { type: 'scan-progress', payload: msg });
        });

        // Start watching the repo
        startWatching(repoPath, (change) => {
            io?.emit('ws-event', { type: 'file-change', payload: change });
        });

        res.json({ ok: true, data: { profile, files } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/repo/profile?path=... */
router.get('/profile', async (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        const profile = await scanRepo(repoPath);
        res.json({ ok: true, data: profile });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/repo/context?path=... – full repo context for AI */
router.get('/context', async (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        const context = await readRepoContext(repoPath);
        res.json({ ok: true, data: context });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/repo/template-vars?path=... */
router.get('/template-vars', async (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        const profile = await scanRepo(repoPath);
        const vars = buildTemplateVars(profile);
        res.json({ ok: true, data: vars });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/repo/watch – start watching a repo for file changes */
router.post('/watch', (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        const io = getIO();
        startWatching(repoPath, (change) => {
            io?.emit('ws-event', { type: 'file-change', payload: change });
        });

        res.json({ ok: true, data: { watching: true } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/repo/unwatch */
router.post('/unwatch', (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        stopWatching(repoPath);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/repo/changes?path=...&since=... */
router.get('/changes', (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        const since = req.query.since ? String(req.query.since) : undefined;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        const changes = getChangedFiles(repoPath, since);
        res.json({ ok: true, data: changes });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** DELETE /api/repo/changes?path=... */
router.delete('/changes', (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        clearChanges(repoPath);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ── Optimization Contexts ────────────────────────────────────

/** GET /api/repo/steering-context?path=... */
router.get('/steering-context', async (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        const ctx = await getSteeringContext(repoPath);
        res.json({ ok: true, data: ctx });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/repo/spec-context?path=...&specId=... */
router.get('/spec-context', async (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.path ?? "");
        const specId = req.query.specId ? String(req.query.specId) : undefined;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'path query required' });
        const ctx = await getSpecContext(repoPath, specId);
        res.json({ ok: true, data: ctx });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/repo/template-context */
router.get('/template-context', (_req: Request, res: Response) => {
    try {
        const templates = loadAllTemplates();
        const available = listTemplates();
        res.json({ ok: true, data: { availableTemplates: available, templates } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
