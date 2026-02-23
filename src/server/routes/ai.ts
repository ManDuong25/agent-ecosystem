/**
 * AI routes – Gemini chat, repo analysis, configuration.
 */

import { Router, Request, Response } from 'express';
import * as aiClient from '../services/ai-client.js';
import { readRepoContext } from '../services/repo-scanner.js';
import { getIO } from '../index.js';

const router = Router();

/** GET /api/ai/config – get current AI config */
router.get('/config', (_req: Request, res: Response) => {
    const config = aiClient.getAIConfig();
    // Mask API key for security
    res.json({
        ok: true,
        data: { ...config, proxyApiKey: config.proxyApiKey ? '***' : '', managementApiKey: config.managementApiKey ? '***' : '' },
    });
});

/** PUT /api/ai/config – update AI config */
router.put('/config', (req: Request, res: Response) => {
    try {
        aiClient.setAIConfig(req.body);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/ai/chat – send a chat message */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ ok: false, error: 'messages array required' });
        }
        const reply = await aiClient.chat(messages);
        res.json({ ok: true, data: reply });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/ai/chat/stream – streaming chat via SSE */
router.post('/chat/stream', async (req: Request, res: Response) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ ok: false, error: 'messages array required' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of aiClient.chatStream(messages)) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            if (chunk.done) break;
        }
        res.end();
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/ai/analyze-repo – comprehensive AI repo analysis */
router.post('/analyze-repo', async (req: Request, res: Response) => {
    try {
        const { repoPath } = req.body;
        if (!repoPath) return res.status(400).json({ ok: false, error: 'repoPath required' });

        const io = getIO();
        io?.emit('ws-event', { type: 'info', payload: 'Starting AI repo analysis...' });

        const repoContext = await readRepoContext(repoPath);
        const messages = aiClient.buildRepoAnalysisPrompt(repoContext);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of aiClient.chatStream(messages)) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            if (chunk.done) break;
        }
        res.end();
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/ai/health – check if AI proxy is reachable */
router.get('/health', async (_req: Request, res: Response) => {
    try {
        const config = aiClient.getAIConfig();
        const response = await fetch(`${config.proxyUrl}/v1/models`, {
            headers: { Authorization: `Bearer ${config.proxyApiKey}` },
            signal: AbortSignal.timeout(5000),
        });
        const ok = response.ok;
        res.json({ ok, data: { reachable: ok, status: response.status } });
    } catch {
        res.json({ ok: false, data: { reachable: false, status: 0 } });
    }
});

export default router;
