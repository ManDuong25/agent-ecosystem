/* ═══════════════════════════════════════════
   Database Service – SQLite via better-sqlite3
   ═══════════════════════════════════════════ */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { DEFAULT_CATEGORIES } from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'expenses.db');

// Ensure data directory
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ── Schema ── */
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6b7280',
    icon TEXT NOT NULL DEFAULT '📦',
    isDefault INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    isRecurring INTEGER NOT NULL DEFAULT 0,
    recurrencePattern TEXT,
    splitWith TEXT,
    paidBy TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    categoryId TEXT NOT NULL,
    "limit" REAL NOT NULL,
    month TEXT NOT NULL,
    UNIQUE(categoryId, month),
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    fromCurrency TEXT NOT NULL,
    toCurrency TEXT NOT NULL,
    rate REAL NOT NULL,
    updatedAt TEXT NOT NULL,
    PRIMARY KEY (fromCurrency, toCurrency)
  );
`);

/* ── Seed defaults ── */
const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (id, name, color, icon, isDefault) VALUES (?, ?, ?, ?, 1)`);
for (const cat of DEFAULT_CATEGORIES) {
  insertCat.run(uuid(), cat.name, cat.color, cat.icon);
}

// Seed exchange rates (static, for demo)
const insertRate = db.prepare(`INSERT OR REPLACE INTO exchange_rates (fromCurrency, toCurrency, rate, updatedAt) VALUES (?, ?, ?, ?)`);
const now = new Date().toISOString();
const rates: [string, string, number][] = [
  ['USD', 'USD', 1], ['EUR', 'USD', 1.08], ['VND', 'USD', 0.000040],
  ['JPY', 'USD', 0.0067], ['GBP', 'USD', 1.27],
  ['USD', 'EUR', 0.93], ['USD', 'VND', 25000], ['USD', 'JPY', 149.5], ['USD', 'GBP', 0.79],
];
for (const [from, to, rate] of rates) {
  insertRate.run(from, to, rate, now);
}

export default db;
export { DB_PATH };
