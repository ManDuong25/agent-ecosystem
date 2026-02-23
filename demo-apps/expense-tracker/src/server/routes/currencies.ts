/* ═══════════════════════════════════════════
   Currencies API
   ═══════════════════════════════════════════ */
import { Router } from 'express';
import db from '../services/database.js';

const router = Router();

/* GET /api/currencies */
router.get('/', (_req, res) => {
  try {
    const rows: any[] = db.prepare(`SELECT DISTINCT fromCurrency as code FROM exchange_rates ORDER BY fromCurrency`).all();
    const rates: any[] = db.prepare(`SELECT * FROM exchange_rates`).all();
    res.json({ ok: true, data: { currencies: rows.map(r => r.code), rates } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
