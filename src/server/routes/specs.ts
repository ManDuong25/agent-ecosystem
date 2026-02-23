/**
 * Specs routes – full Spec-Driven Development workflow + bug tracking.
 */

import { Router, Request, Response } from 'express';
import * as specEngine from '../services/spec-engine.js';
import { getIO } from '../index.js';

const router = Router();

// ── Specs CRUD ───────────────────────────────────────────────

/** GET /api/specs?repoPath=... – list all specs */
router.get('/', (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.repoPath ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });
        const specs = specEngine.listSpecs(repoPath);
        res.json({ ok: true, data: specs });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/specs – create a new spec */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { repoPath, name, description } = req.body;
        if (!repoPath || !name) return res.status(400).json({ ok: false, error: 'repoPath and name required' });
        const spec = await specEngine.createSpec(repoPath, name, description ?? '');
        res.json({ ok: true, data: spec });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/specs/:id?repoPath=... – get spec status */
router.get('/:id', (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.repoPath ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });
        const spec = specEngine.getSpecStatus(repoPath, String(req.params.id));
        res.json({ ok: true, data: spec });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** DELETE /api/specs/:id?repoPath=... – delete a spec */
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.repoPath ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });
        specEngine.deleteSpec(repoPath, String(req.params.id));
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ── AI Generation ────────────────────────────────────────────

/** POST /api/specs/:id/requirements – generate requirements via AI (SSE) */
router.post('/:id/requirements', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const io = getIO();
        await specEngine.generateRequirements(repoPath, String(req.params.id), (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            io?.emit('ws-event', { type: 'ai-stream', payload: { specId: String(req.params.id), phase: 'requirements', chunk } });
        });
        io?.emit('ws-event', { type: 'spec-update', payload: { specId: String(req.params.id) } });
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err: any) {
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

/** POST /api/specs/:id/design – generate design via AI (SSE) */
router.post('/:id/design', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const io = getIO();
        await specEngine.generateDesign(repoPath, String(req.params.id), (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            io?.emit('ws-event', { type: 'ai-stream', payload: { specId: String(req.params.id), phase: 'design', chunk } });
        });
        io?.emit('ws-event', { type: 'spec-update', payload: { specId: String(req.params.id) } });
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err: any) {
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

/** POST /api/specs/:id/tasks – generate tasks via AI (SSE) */
router.post('/:id/tasks', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const io = getIO();
        await specEngine.generateTasks(repoPath, String(req.params.id), (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            io?.emit('ws-event', { type: 'ai-stream', payload: { specId: String(req.params.id), phase: 'tasks', chunk } });
        });
        io?.emit('ws-event', { type: 'spec-update', payload: { specId: String(req.params.id) } });
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err: any) {
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

/** PUT /api/specs/:specId/tasks/:taskId – update task status */
router.put('/:specId/tasks/:taskId', (req: Request, res: Response) => {
    try {
        const { repoPath, status, output } = req.body;
        if (!repoPath || !status) return res.status(400).json({ ok: false, error: 'repoPath and status required' });
        const spec = specEngine.updateTask(repoPath, String(req.params.specId), String(req.params.taskId), status, output);

        const io = getIO();
        io?.emit('ws-event', { type: 'task-progress', payload: { specId: String(req.params.specId), taskId: String(req.params.taskId), status } });
        res.json({ ok: true, data: spec });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ── Bugs ─────────────────────────────────────────────────────

/** GET /api/specs/bugs?repoPath=... – list all bugs */
router.get('/bugs/list', (req: Request, res: Response) => {
    try {
        const repoPath = String(req.query.repoPath ?? "");
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });
        const bugs = specEngine.listBugs(repoPath);
        res.json({ ok: true, data: bugs });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/specs/bugs – create a bug */
router.post('/bugs', async (req: Request, res: Response) => {
    try {
        const { repoPath, specId, title, description, stepsToReproduce, severity } = req.body;
        if (!repoPath || !title) return res.status(400).json({ ok: false, error: 'repoPath and title required' });
        const bug = specEngine.createBug(repoPath, specId, { title, description: description ?? '', stepsToReproduce: stepsToReproduce ?? '', severity: severity ?? 'medium' });
        res.json({ ok: true, data: bug });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/specs/bugs/:bugId – update bug status */
router.put('/bugs/:bugId', (req: Request, res: Response) => {
    try {
        const { repoPath, status, resolution } = req.body;
        if (!repoPath || !status) return res.status(400).json({ ok: false, error: 'repoPath and status required' });
        const bug = specEngine.updateBugStatus(repoPath, String(req.params.bugId), status, resolution);
        res.json({ ok: true, data: bug });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/specs/bugs/:bugId/analyze – AI analysis of a bug (SSE) */
router.post('/bugs/:bugId/analyze', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const io = getIO();
        await specEngine.analyzeBug(repoPath, String(req.params.bugId), (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            io?.emit('ws-event', { type: 'ai-stream', payload: { bugId: String(req.params.bugId), chunk } });
        });
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err: any) {
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

export default router;
