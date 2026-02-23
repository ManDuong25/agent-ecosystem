/* ═══════════════════════════════════════════
   Budgets API
   ═══════════════════════════════════════════ */
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../services/database.js';

const router = Router();

/* GET /api/budgets?month=YYYY-MM */
router.get('/', (req, res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));

    const budgets: any[] = db.prepare(`
      SELECT b.*, c.name as categoryName, c.color, c.icon
      FROM budgets b
      JOIN categories c ON b.categoryId = c.id
      WHERE b.month = ?
    `).all(month);

    // Calculate spent for each budget
    const data = budgets.map((b) => {
      const spent: any = db.prepare(`
        SELECT COALESCE(SUM(t.amount * COALESCE(er.rate, 1)), 0) as total
        FROM transactions t
        LEFT JOIN exchange_rates er ON t.currency = er.fromCurrency AND er.toCurrency = 'USD'
        WHERE t.category = ? AND t.date LIKE ?
      `).get(b.categoryId, `${month}%`);

      const spentAmount = spent?.total || 0;
      const percentage = b.limit > 0 ? (spentAmount / b.limit) * 100 : 0;

      return {
        ...b,
        spent: Math.round(spentAmount * 100) / 100,
        percentage: Math.round(percentage * 10) / 10,
        level: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok',
      };
    });

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* POST /api/budgets */
router.post('/', (req, res) => {
  try {
    const { categoryId, limit, month } = req.body;
    if (!categoryId || limit == null || !month) {
      return res.status(400).json({ ok: false, error: 'categoryId, limit, and month required' });
    }

    const id = uuid();
    db.prepare(`INSERT OR REPLACE INTO budgets (id, categoryId, "limit", month) VALUES (?, ?, ?, ?)`)
      .run(id, categoryId, limit, month);

    res.json({ ok: true, data: { id, categoryId, limit, month } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* DELETE /api/budgets/:id */
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`DELETE FROM budgets WHERE id = ?`).run(String(req.params.id));
    if (result.changes === 0) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, data: { deleted: String(req.params.id) } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
