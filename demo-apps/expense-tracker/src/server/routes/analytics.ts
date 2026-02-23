/* ═══════════════════════════════════════════
   Analytics API
   ═══════════════════════════════════════════ */
import { Router } from 'express';
import db from '../services/database.js';

const router = Router();

/* GET /api/analytics/summary?month=YYYY-MM */
router.get('/summary', (req, res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));

    const stats: any = db.prepare(`
      SELECT
        COALESCE(SUM(t.amount * COALESCE(er.rate, 1)), 0) as totalExpenses,
        COUNT(*) as transactionCount
      FROM transactions t
      LEFT JOIN exchange_rates er ON t.currency = er.fromCurrency AND er.toCurrency = 'USD'
      WHERE t.date LIKE ?
    `).get(`${month}%`);

    const topCat: any = db.prepare(`
      SELECT c.name, SUM(t.amount * COALESCE(er.rate, 1)) as total
      FROM transactions t
      JOIN categories c ON t.category = c.id
      LEFT JOIN exchange_rates er ON t.currency = er.fromCurrency AND er.toCurrency = 'USD'
      WHERE t.date LIKE ?
      GROUP BY t.category
      ORDER BY total DESC
      LIMIT 1
    `).get(`${month}%`);

    // Budget alerts
    const budgets: any[] = db.prepare(`
      SELECT b.*, c.name as categoryName
      FROM budgets b
      JOIN categories c ON b.categoryId = c.id
      WHERE b.month = ?
    `).all(month);

    const budgetAlerts = budgets.map((b) => {
      const spent: any = db.prepare(`
        SELECT COALESCE(SUM(t.amount * COALESCE(er.rate, 1)), 0) as total
        FROM transactions t
        LEFT JOIN exchange_rates er ON t.currency = er.fromCurrency AND er.toCurrency = 'USD'
        WHERE t.category = ? AND t.date LIKE ?
      `).get(b.categoryId, `${month}%`);

      const spentAmount = spent?.total || 0;
      const percentage = b.limit > 0 ? (spentAmount / b.limit) * 100 : 0;

      return {
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        limit: b.limit,
        spent: Math.round(spentAmount * 100) / 100,
        percentage: Math.round(percentage * 10) / 10,
        level: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok',
      };
    }).filter(a => a.level !== 'ok');

    res.json({
      ok: true,
      data: {
        totalExpenses: Math.round((stats?.totalExpenses || 0) * 100) / 100,
        totalIncome: 0,
        transactionCount: stats?.transactionCount || 0,
        topCategory: topCat?.name || 'N/A',
        baseCurrency: 'USD',
        budgetAlerts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/analytics/by-category?month=YYYY-MM */
router.get('/by-category', (req, res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));

    const rows: any[] = db.prepare(`
      SELECT c.name as category, c.color, COUNT(*) as count,
             SUM(t.amount * COALESCE(er.rate, 1)) as total
      FROM transactions t
      JOIN categories c ON t.category = c.id
      LEFT JOIN exchange_rates er ON t.currency = er.fromCurrency AND er.toCurrency = 'USD'
      WHERE t.date LIKE ?
      GROUP BY t.category
      ORDER BY total DESC
    `).all(`${month}%`);

    const grandTotal = rows.reduce((s, r) => s + (r.total || 0), 0);

    const data = rows.map(r => ({
      category: r.category,
      color: r.color,
      total: Math.round((r.total || 0) * 100) / 100,
      count: r.count,
      percentage: grandTotal > 0 ? Math.round(((r.total || 0) / grandTotal) * 1000) / 10 : 0,
    }));

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/analytics/trends?months=6 */
router.get('/trends', (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));
    const now = new Date();
    const data: { month: string; total: number; count: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);

      const row: any = db.prepare(`
        SELECT COALESCE(SUM(t.amount * COALESCE(er.rate, 1)), 0) as total, COUNT(*) as count
        FROM transactions t
        LEFT JOIN exchange_rates er ON t.currency = er.fromCurrency AND er.toCurrency = 'USD'
        WHERE t.date LIKE ?
      `).get(`${monthStr}%`);

      data.push({
        month: monthStr,
        total: Math.round((row?.total || 0) * 100) / 100,
        count: row?.count || 0,
      });
    }

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/analytics/shared-expenses – mid-dev feature */
router.get('/shared-expenses', (_req, res) => {
  try {
    const rows: any[] = db.prepare(`
      SELECT * FROM transactions WHERE splitWith IS NOT NULL
    `).all();

    const people: Record<string, { owes: number; isOwed: number }> = {};

    for (const tx of rows) {
      const splitWith: string[] = JSON.parse(tx.splitWith || '[]');
      if (splitWith.length === 0) continue;

      const splitCount = splitWith.length + 1; // +1 for the payer
      const perPerson = tx.amount / splitCount;
      const payer = tx.paidBy || 'Me';

      for (const person of splitWith) {
        if (!people[person]) people[person] = { owes: 0, isOwed: 0 };
        if (payer === 'Me') {
          people[person].owes += perPerson;
        }
      }
      if (payer !== 'Me') {
        if (!people[payer]) people[payer] = { owes: 0, isOwed: 0 };
        people[payer].isOwed += perPerson * splitWith.length;
      }
    }

    const data = Object.entries(people).map(([person, vals]) => ({
      person,
      owes: Math.round(vals.owes * 100) / 100,
      isOwed: Math.round(vals.isOwed * 100) / 100,
      net: Math.round((vals.owes - vals.isOwed) * 100) / 100,
    }));

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
