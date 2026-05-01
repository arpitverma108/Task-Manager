/**
 * db.js — PostgreSQL via the 'pg' package
 *
 * Reads DATABASE_URL from environment (Railway provides this automatically
 * when you attach a Postgres plugin to your service).
 *
 * Exports:
 *   initializeDb()  — call once at startup; creates tables if they don't exist
 *   getDb()         — returns a helper with .prepare(sql) that mirrors the
 *                     old better-sqlite3 / sql.js sync API, but uses async
 *                     pg queries under the hood via a thin wrapper.
 *
 * NOTE: Because pg is async, all controller functions that call
 * db.prepare(...).get / .all / .run must be async and await the result.
 * The controllers in this migration have been updated accordingly.
 */

const { Pool } = require('pg');

let pool = null;

// ── Pool factory ────────────────────────────────────────────────────────────

function getPool() {
  if (!pool) throw new Error('DB not ready — initializeDb() must be awaited first.');
  return pool;
}

// ── Compatibility wrapper ────────────────────────────────────────────────────
//
// Returns an object that looks like a better-sqlite3 statement but is async.
// Usage:  const row  = await db.prepare('SELECT ...').get(val1, val2)
//         const rows = await db.prepare('SELECT ...').all(val1)
//         const res  = await db.prepare('INSERT ...').run(val1, val2)
//
// PostgreSQL uses $1, $2, … placeholders. We auto-convert ? → $N so the
// existing SQL strings in the controllers work without modification.

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function makeStatement(sql) {
  const pgSql = convertPlaceholders(sql);

  return {
    async get(...params) {
      const { rows } = await getPool().query(pgSql, params.flat());
      return rows[0] ?? undefined;
    },

    async all(...params) {
      const { rows } = await getPool().query(pgSql, params.flat());
      return rows;
    },

    async run(...params) {
      // For INSERT … RETURNING id we detect RETURNING clause; otherwise just execute.
      const { rows, rowCount } = await getPool().query(pgSql, params.flat());
      const lastInsertRowid = rows[0]?.id ?? null;
      return { lastInsertRowid, changes: rowCount };
    },
  };
}

function getDb() {
  if (!pool) throw new Error('DB not ready — initializeDb() must be awaited first.');
  return {
    prepare: (sql) => makeStatement(sql),
    // For raw multi-statement exec (schema creation)
    exec: async (sql) => { await pool.query(sql); },
  };
}

// ── Initialization ──────────────────────────────────────────────────────────

async function initializeDb() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
      ? { rejectUnauthorized: false }
      : false,
  });

  // Smoke-test the connection
  const client = await pool.connect();
  client.release();

  // Create schema (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'member'
                    CHECK(role IN ('admin', 'member')),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          SERIAL PRIMARY KEY,
      name        TEXT    NOT NULL,
      description TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT,
      assigned_to INTEGER REFERENCES users(id),
      status      TEXT    NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'in_progress', 'completed')),
      due_date    DATE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('✅ PostgreSQL database ready.');
}

function getPool() {
  if (!pool) throw new Error('DB not ready — initializeDb() must be awaited first.');
  return pool;
}

module.exports = { getDb, getPool, initializeDb };