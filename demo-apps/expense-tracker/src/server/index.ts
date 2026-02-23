/* ═══════════════════════════════════════════
   Express Server Entry Point
   ═══════════════════════════════════════════ */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import transactionsRouter from './routes/transactions.js';
import categoriesRouter from './routes/categories.js';
import budgetsRouter from './routes/budgets.js';
import analyticsRouter from './routes/analytics.js';
import exportRouter from './routes/export.js';
import currenciesRouter from './routes/currencies.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 5201;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/* ── API Routes ── */
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/export', exportRouter);
app.use('/api/currencies', currenciesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'smart-expense-tracker', version: '1.0.0' });
});

/* ── Serve client in production ── */
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`💰 Expense Tracker API running on http://localhost:${PORT}`);
});
