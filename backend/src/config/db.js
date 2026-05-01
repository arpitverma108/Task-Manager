/**
 * db.js — SQLite via sql.js (WebAssembly, zero native compilation)
 *
 * Persistence: the DB is loaded from / saved to a binary file on disk.
 * Every write (run / exec) auto-saves the file synchronously.
 *
 * NOTE: sql.js runs entirely in-memory (WASM). WAL journal mode and
 * foreign_keys pragmas are set via exec() which works correctly.
 */

const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '../../data/taskmanager.db');

let _raw = null; // raw sql.js Database instance

// ── Persistence helpers ────────────────────────────────────────────────────

function ensureDir() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

function saveToFile() {
  try {
    ensureDir();
    const data = _raw.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[db] Failed to persist database to disk:', err);
    // Don't throw — let the request complete, but log so ops can see it
  }
}

// ── Compatibility wrapper (mirrors better-sqlite3 sync API) ───────────────

function makeStatement(sql) {
  return {
    get(...params) {
      const stmt = _raw.prepare(sql);
      if (params.length) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },

    all(...params) {
      const stmt = _raw.prepare(sql);
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },

    run(...params) {
      const stmt = _raw.prepare(sql);
      if (params.length) stmt.bind(params);
      stmt.step();
      stmt.free();

      const idRes = _raw.exec('SELECT last_insert_rowid()');
      const chRes = _raw.exec('SELECT changes()');
      const lastInsertRowid = idRes[0]?.values[0][0] ?? 0;
      const changes         = chRes[0]?.values[0][0] ?? 0;

      saveToFile();
      return { lastInsertRowid, changes };
    },
  };
}

function getDb() {
  if (!_raw) throw new Error('DB not ready — initializeDb() must be awaited first.');
  return {
    prepare: (sql) => makeStatement(sql),
    exec:    (sql) => { _raw.exec(sql); saveToFile(); },
    pragma:  ()    => {},
  };
}

// ── Initialization (async — call once at startup) ──────────────────────────

async function initializeDb() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  ensureDir();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _raw = new SQL.Database(buf);
  } else {
    _raw = new SQL.Database();
  }

  // Foreign keys must be set via exec (pragmas work in sql.js this way)
  _raw.exec('PRAGMA foreign_keys = ON;');

  _raw.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'member'
                    CHECK(role IN ('admin', 'member')),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT,
      assigned_to INTEGER REFERENCES users(id),
      status      TEXT    NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'in_progress', 'completed')),
      due_date    DATE,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveToFile();
  console.log('✅ Database ready at:', DB_PATH);
}

module.exports = { getDb, initializeDb };