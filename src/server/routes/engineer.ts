/**
 * Engineer routes – AI Software Engineer loop.
 * Detects file changes, sends to Gemini/ChatGPT via Chrome, returns results.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as chrome from '../services/chrome-bridge.js';
import { getChangedFiles } from '../services/file-watcher.js';
import { getIO } from '../index.js';

const router = Router();

// ── Chrome session ───────────────────────────────────────────

/** GET /api/engineer/chrome/status */
router.get('/chrome/status', (_req: Request, res: Response) => {
    const session = chrome.getSession();
    res.json({ ok: true, data: session });
});

/** POST /api/engineer/chrome/launch */
router.post('/chrome/launch', async (req: Request, res: Response) => {
    try {
        const { target, profilePath } = req.body;
        if (profilePath) chrome.setChromeConfig({ profilePath });
        const io = getIO();
        io?.emit('ws-event', { type: 'chrome-status', payload: 'Launching Chrome...' });
        const session = await chrome.launch();
        if (target) session.target = target;
        io?.emit('ws-event', { type: 'chrome-status', payload: `Chrome ready (${session.id})` });
        res.json({ ok: true, data: session });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/engineer/chrome/close */
router.post('/chrome/close', async (_req: Request, res: Response) => {
    try {
        await chrome.close();
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/engineer/chrome/config */
router.put('/chrome/config', (req: Request, res: Response) => {
    try {
        chrome.setChromeConfig(req.body);
        res.json({ ok: true, data: chrome.getChromeConfig() });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/engineer/chrome/config */
router.get('/chrome/config', (_req: Request, res: Response) => {
    res.json({ ok: true, data: chrome.getChromeConfig() });
});

// ── File change review ───────────────────────────────────────

/** POST /api/engineer/review – send changed files to AI via Chrome */
router.post('/review', async (req: Request, res: Response) => {
    try {
        const { repoPath, target, prompt, filePaths } = req.body;
        if (!repoPath || !target) {
            return res.status(400).json({ ok: false, error: 'repoPath and target required' });
        }

        const io = getIO();
        io?.emit('ws-event', { type: 'chrome-status', payload: `Preparing review for ${target}...` });

        // Get files to review
        let files: { path: string; content: string }[];

        if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
            // Use specific files
            files = filePaths.map((fp: string) => {
                const fullPath = path.isAbsolute(fp) ? fp : path.join(repoPath, fp);
                return {
                    path: path.relative(repoPath, fullPath),
                    content: fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '(file not found)',
                };
            });
        } else {
            // Use recently changed files
            const changes = getChangedFiles(repoPath);
            const recentChanges = changes.filter(c => c.type !== 'deleted').slice(-10);
            files = recentChanges.map(c => ({
                path: c.relativePath,
                content: fs.existsSync(c.path) ? fs.readFileSync(c.path, 'utf-8') : '(deleted)',
            }));
        }

        if (files.length === 0) {
            return res.status(400).json({ ok: false, error: 'No files to review' });
        }

        io?.emit('ws-event', { type: 'chrome-status', payload: `Sending ${files.length} files to ${target}...` });

        const reviewPrompt = prompt || 'Please review these code changes. Check for bugs, improvements, and best practices. Provide specific feedback.';
        const response = await chrome.sendFilesForReview(files, target, reviewPrompt);

        io?.emit('ws-event', { type: 'chrome-status', payload: 'Review complete' });
        res.json({ ok: true, data: { response, filesReviewed: files.length } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/engineer/send – send arbitrary text to Gemini/ChatGPT */
router.post('/send', async (req: Request, res: Response) => {
    try {
        const { target, content } = req.body;
        if (!target || !content) {
            return res.status(400).json({ ok: false, error: 'target and content required' });
        }

        const io = getIO();
        io?.emit('ws-event', { type: 'chrome-status', payload: `Sending to ${target}...` });

        let response: string;
        if (target === 'gemini') {
            response = await chrome.sendToGemini(content);
        } else if (target === 'chatgpt') {
            response = await chrome.sendToChatGPT(content);
        } else {
            return res.status(400).json({ ok: false, error: 'target must be "gemini" or "chatgpt"' });
        }

        io?.emit('ws-event', { type: 'chrome-status', payload: 'Complete' });
        res.json({ ok: true, data: response });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
