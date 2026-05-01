const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const { getAllUsers, getMe } = require('../controllers/userController');

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users/me  — own profile
router.get('/me', getMe);

// GET /api/users  — admin only: list all users
router.get('/', requireAdmin, getAllUsers);

module.exports = router;