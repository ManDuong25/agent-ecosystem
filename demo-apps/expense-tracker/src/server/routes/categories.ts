/* ═══════════════════════════════════════════
   Categories API
   ═══════════════════════════════════════════ */
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../services/database.js';

const router = Router();

/* GET /api/categories */
router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM categories ORDER BY isDefault DESC, name ASC`).all();
    const data = rows.map((r: any) => ({ ...r, isDefault: !!r.isDefault }));
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* POST /api/categories */
router.post('/', (req, res) => {
  try {
    const { name, color = '#6b7280', icon = '📦' } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });

    const id = uuid();
    db.prepare(`INSERT INTO categories (id, name, color, icon, isDefault) VALUES (?, ?, ?, ?, 0)`)
      .run(id, name, color, icon);

    const row: any = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(id);
    res.json({ ok: true, data: { ...row, isDefault: !!row.isDefault } });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, error: 'Category already exists' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* DELETE /api/categories/:id */
router.delete('/:id', (req, res) => {
  try {
    const cat: any = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(String(req.params.id));
    if (!cat) return res.status(404).json({ ok: false, error: 'not found' });
    if (cat.isDefault) return res.status(400).json({ ok: false, error: 'Cannot delete default category' });

    db.prepare(`DELETE FROM categories WHERE id = ?`).run(String(req.params.id));
    res.json({ ok: true, data: { deleted: String(req.params.id) } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
