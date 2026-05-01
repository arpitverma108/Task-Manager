const { getDb } = require('../config/db');

/**
 * GET /api/users
 * Returns all users (admin only). Used for assigning tasks and managing members.
 */
function getAllUsers(req, res) {
  try {
    const db = getDb();
    const users = db.prepare(
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
function getMe(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json(user);
}

module.exports = { getAllUsers, getMe };
