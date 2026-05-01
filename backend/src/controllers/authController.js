const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { getDb } = require('../config/db');

/**
 * POST /api/auth/signup
 * Creates a new user. The very first user becomes Admin; all others are Members.
 */
async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;
  const db = getDb();

  try {
    // Check if email is already taken
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    // First user ever → admin; everyone else → member
    const countRow = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    const role = Number(countRow.count) === 0 ? 'admin' : 'member';

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user and return the new id
    const result = await db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id'
    ).run(name, email.toLowerCase(), password_hash, role);

    const user = { id: result.lastInsertRowid, name, email: email.toLowerCase(), role };

    // Sign JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { email, password } = req.body;
  const db = getDb();

  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
}

module.exports = { signup, login };