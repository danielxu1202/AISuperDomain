import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "../data/xianghe.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS materials (
  name TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS classics (
  name TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS solar_terms (
  name TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS formulas (
  id TEXT PRIMARY KEY,
  title TEXT,
  kind TEXT,
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  formula_id TEXT,
  rating TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  vip INTEGER DEFAULT 0,
  daily_count INTEGER DEFAULT 0,
  daily_date TEXT
);
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  formula_id TEXT,
  title TEXT,
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

export function upsertJson(table, name, payload) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (name, payload) VALUES (?, ?)`).run(name, JSON.stringify(payload));
}

export function allJson(table) {
  return db.prepare(`SELECT payload FROM ${table}`).all().map((r) => JSON.parse(r.payload));
}

export function getUser(id = "demo-user") {
  let row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!row) {
    db.prepare("INSERT INTO users (id, name, vip, daily_count, daily_date) VALUES (?, ?, 0, 0, ?)")
      .run(id, "香友", new Date().toISOString().slice(0, 10));
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (row.daily_date !== today) {
    db.prepare("UPDATE users SET daily_count = 0, daily_date = ? WHERE id = ?").run(today, id);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }
  return row;
}

export function bumpGenerate(id = "demo-user") {
  const u = getUser(id);
  db.prepare("UPDATE users SET daily_count = daily_count + 1 WHERE id = ?").run(id);
  return getUser(id);
}

export function setVip(id, vip) {
  getUser(id);
  db.prepare("UPDATE users SET vip = ? WHERE id = ?").run(vip ? 1 : 0, id);
  return getUser(id);
}
