/**
 * Skills routes – add, update, remove, list skills from GitHub repos.
 */

import { Router, Request, Response } from 'express';
import * as skillMgr from '../services/skill-manager.js';
import { getIO } from '../index.js';

const router = Router();

/** GET /api/skills – list all skills */
router.get('/', (_req: Request, res: Response) => {
    try {
        const skills = skillMgr.listSkills();
        res.json({ ok: true, data: skills });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/skills – add a new skill from GitHub URL */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { githubUrl } = req.body;
        if (!githubUrl) return res.status(400).json({ ok: false, error: 'githubUrl required' });

        const io = getIO();
        const skill = await skillMgr.addSkill(githubUrl, (msg) => {
            io?.emit('ws-event', { type: 'skill-update', payload: msg });
        });
        res.json({ ok: true, data: skill });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/skills/:id – update a specific skill */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const io = getIO();
        const skill = await skillMgr.updateSkill(String(req.params.id), (msg) => {
            io?.emit('ws-event', { type: 'skill-update', payload: msg });
        });
        res.json({ ok: true, data: skill });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/skills – update all skills */
router.put('/', async (_req: Request, res: Response) => {
    try {
        const io = getIO();
        const skills = await skillMgr.updateAllSkills((msg) => {
            io?.emit('ws-event', { type: 'skill-update', payload: msg });
        });
        res.json({ ok: true, data: skills });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** DELETE /api/skills/:id – remove a skill */
router.delete('/:id', (req: Request, res: Response) => {
    try {
        skillMgr.removeSkill(String(req.params.id));
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/skills/index – build and return skill index */
router.get('/index', (_req: Request, res: Response) => {
    try {
        const index = skillMgr.buildSkillIndex();
        res.json({ ok: true, data: index });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
