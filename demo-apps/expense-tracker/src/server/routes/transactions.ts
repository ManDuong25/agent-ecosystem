/* ═══════════════════════════════════════════
   Transactions CRUD API
   ═══════════════════════════════════════════ */
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../services/database.js';

const router = Router();

/* GET /api/transactions?search=&category=&currency=&from=&to=&page=&limit= */
router.get('/', (req, res) => {
  try {
    let sql = `SELECT * FROM transactions WHERE 1=1`;
    const params: any[] = [];

    if (req.query.search) {
      sql += ` AND description LIKE ?`;
      params.push(`%${req.query.search}%`);
    }
    if (req.query.category) {
      sql += ` AND category = ?`;
      params.push(String(req.query.category));
    }
    if (req.query.currency) {
      sql += ` AND currency = ?`;
      params.push(String(req.query.currency));
    }
    if (req.query.from) {
      sql += ` AND date >= ?`;
      params.push(String(req.query.from));
    }
    if (req.query.to) {
      sql += ` AND date <= ?`;
      params.push(String(req.query.to));
    }

    sql += ` ORDER BY date DESC, createdAt DESC`;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const rows = db.prepare(sql).all(...params);
    // Parse splitWith JSON
    const data = rows.map((r: any) => ({
      ...r,
      isRecurring: !!r.isRecurring,
      splitWith: r.splitWith ? JSON.parse(r.splitWith) : undefined,
    }));

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* POST /api/transactions */
router.post('/', (req, res) => {
  try {
    const { amount, currency = 'USD', category, description = '', date, isRecurring = false, recurrencePattern, splitWith, paidBy } = req.body;
    if (!amount || !category || !date) {
      return res.status(400).json({ ok: false, error: 'amount, category, and date required' });
    }

    const id = uuid();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO transactions (id, amount, currency, category, description, date, isRecurring, recurrencePattern, splitWith, paidBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, amount, currency, category, description, date, isRecurring ? 1 : 0, recurrencePattern || null, splitWith ? JSON.stringify(splitWith) : null, paidBy || null, now, now);

    const row: any = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(id);
    res.json({ ok: true, data: { ...row, isRecurring: !!row.isRecurring, splitWith: row.splitWith ? JSON.parse(row.splitWith) : undefined } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* PUT /api/transactions/:id */
router.put('/:id', (req, res) => {
  try {
    const { amount, currency, category, description, date, isRecurring, recurrencePattern, splitWith, paidBy } = req.body;
    const existing: any = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(String(req.params.id));
    if (!existing) return res.status(404).json({ ok: false, error: 'not found' });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE transactions SET
        amount = COALESCE(?, amount),
        currency = COALESCE(?, currency),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        isRecurring = COALESCE(?, isRecurring),
        recurrencePattern = COALESCE(?, recurrencePattern),
        splitWith = COALESCE(?, splitWith),
        paidBy = COALESCE(?, paidBy),
        updatedAt = ?
      WHERE id = ?
    `).run(
      amount ?? null, currency ?? null, category ?? null, description ?? null,
      date ?? null, isRecurring != null ? (isRecurring ? 1 : 0) : null,
      recurrencePattern ?? null, splitWith ? JSON.stringify(splitWith) : null,
      paidBy ?? null, now, String(req.params.id)
    );

    const row: any = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(String(req.params.id));
    res.json({ ok: true, data: { ...row, isRecurring: !!row.isRecurring, splitWith: row.splitWith ? JSON.parse(row.splitWith) : undefined } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* DELETE /api/transactions/:id */
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`DELETE FROM transactions WHERE id = ?`).run(String(req.params.id));
    if (result.changes === 0) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, data: { deleted: String(req.params.id) } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
