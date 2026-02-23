/**
 * Server entry point – Express + Socket.io.
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

import repoRoutes from './routes/repo.js';
import skillsRoutes from './routes/skills.js';
import specsRoutes from './routes/specs.js';
import aiRoutes from './routes/ai.js';
import engineerRoutes from './routes/engineer.js';

const PORT = parseInt(process.env.PORT ?? '4927', 10);
const app = express();
const httpServer = createServer(app);

// Socket.io
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

// Export io for routes to use
let _io: SocketServer | null = null;
export function getIO(): SocketServer | null {
  return _io;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api/repo', repoRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/specs', specsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/engineer', engineerRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '0.2.0', uptime: process.uptime() });
});

// Serve built client in production
const clientDist = path.join(process.cwd(), 'dist', 'client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// WebSocket connections
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Start
_io = io;
httpServer.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   🚀 Agent Ecosystem v0.2.0                │
  │                                             │
  │   API:    http://localhost:${PORT}            │
  │   Health: http://localhost:${PORT}/api/health │
  │                                             │
  └─────────────────────────────────────────────┘
  `);
});

export default app;
