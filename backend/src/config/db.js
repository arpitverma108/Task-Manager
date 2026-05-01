/**
 * db.js — PostgreSQL via the 'pg' package
 *
 * Reads DATABASE_URL from environment (Railway injects this automatically
 * when a Postgres plugin is attached to the service).
 */

const { Pool } = require('pg');

let pool = null;

// ── Pool accessor (used by taskController for dynamic queries) ──────────────

function getPool() {
  if (!pool) throw new Error('DB not ready — call initializeDb() first.');
  return pool;
}

// ── ? → $N placeholder converter ────────────────────────────────────────────

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── Compatibility wrapper (mirrors better-sqlite3 sync API, but async) ───────

function makeStatement(sql) {
  const pgSql = convertPlaceholders(sql);

  return {
    async get(...params) {
      const { rows } = await pool.query(pgSql, params.flat());
      return rows[0] ?? undefined;
    },

    async all(...params) {
      const { rows } = await pool.query(pgSql, params.flat());
      return rows;
    },

    async run(...params) {
      const { rows, rowCount } = await pool.query(pgSql, params.flat());
      // Supports INSERT … RETURNING id
      const lastInsertRowid = rows[0]?.id ?? null;
      return { lastInsertRowid, changes: rowCount };
    },
  };
}

function getDb() {
  if (!pool) throw new Error('DB not ready — call initializeDb() first.');
  return {
    prepare: (sql) => makeStatement(sql),
  };
}

// ── Schema setup ─────────────────────────────────────────────────────────────
// pg cannot execute multiple statements in one query() call, so we run each
// CREATE TABLE separately.

async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'member'
                    CHECK(role IN ('admin', 'member')),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id          SERIAL PRIMARY KEY,
      name        TEXT    NOT NULL,
      description TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    )
  `);

  await pool.query(`
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
    )
  `);
}

// ── Initialization (call once at server startup) ──────────────────────────────

async function initializeDb() {
  const dbUrl = process.env.DATABASE_URL || '';

  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  // Internal Railway private networking (*.railway.internal) does NOT use SSL.
  // Public/external URLs do need SSL.
  const isInternal = dbUrl.includes('.railway.internal');
  const ssl = isInternal ? false : { rejectUnauthorized: false };

  pool = new Pool({ connectionString: dbUrl, ssl });

  // Smoke-test
  const client = await pool.connect();
  client.release();
  console.log('✅ Connected to PostgreSQL.');

  await createSchema();
  console.log('✅ Schema ready.');
}

module.exports = { getDb, getPool, initializeDb };