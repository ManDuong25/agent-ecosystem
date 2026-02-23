/* ═══════════════════════════════════════════
   Export API – CSV & JSON
   ═══════════════════════════════════════════ */
import { Router } from 'express';
import db from '../services/database.js';

const router = Router();

function getFilteredTransactions(query: any) {
  let sql = `SELECT t.*, c.name as categoryName FROM transactions t LEFT JOIN categories c ON t.category = c.id WHERE 1=1`;
  const params: any[] = [];

  if (query.category) { sql += ` AND t.category = ?`; params.push(String(query.category)); }
  if (query.currency) { sql += ` AND t.currency = ?`; params.push(String(query.currency)); }
  if (query.from) { sql += ` AND t.date >= ?`; params.push(String(query.from)); }
  if (query.to) { sql += ` AND t.date <= ?`; params.push(String(query.to)); }

  sql += ` ORDER BY date DESC`;
  return db.prepare(sql).all(...params);
}

/* GET /api/export/csv */
router.get('/csv', (req, res) => {
  try {
    const rows: any[] = getFilteredTransactions(req.query);
    const header = 'Date,Description,Category,Amount,Currency,Recurring,PaidBy,SplitWith\n';
    const csvRows = rows.map(r =>
      `${r.date},"${(r.description || '').replace(/"/g, '""')}","${r.categoryName || r.category}",${r.amount},${r.currency},${r.isRecurring ? 'Yes' : 'No'},"${r.paidBy || ''}","${r.splitWith || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(header + csvRows);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/export/json */
router.get('/json', (req, res) => {
  try {
    const rows: any[] = getFilteredTransactions(req.query);
    const data = rows.map(r => ({
      ...r,
      isRecurring: !!r.isRecurring,
      splitWith: r.splitWith ? JSON.parse(r.splitWith) : undefined,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.json');
    res.json({ exportedAt: new Date().toISOString(), count: data.length, transactions: data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
