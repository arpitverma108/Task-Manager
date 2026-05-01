const { Router } = require('express');
const { body } = require('express-validator');
const { signup, login } = require('../controllers/authController');

const router = Router();

// Validation schemas
const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

// POST /api/auth/signup
router.post('/signup', signupRules, signup);

// POST /api/auth/login
router.post('/login', loginRules, login);

module.exports = router;