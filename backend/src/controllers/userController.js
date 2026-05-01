const { getDb } = require('../config/db');

/**
 * GET /api/users
 * Returns all users (admin only).
 */
async function getAllUsers(req, res) {
  try {
    const db = getDb();
    const users = await db.prepare(
      'SELECT id, name, email, role, created_at FROM users ORDER BY name ASC'
    ).all();
    res.json(users);
  } catch (err) {
    console.error('[getAllUsers]', err);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
}

/**
 * GET /api/users/me
 * Returns the currently authenticated user's profile.
 */
async function getMe(req, res) {
  const db = getDb();
  const user = await db.prepare(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(user);
}

module.exports = { getAllUsers, getMe };