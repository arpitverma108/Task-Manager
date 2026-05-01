const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const {
  getTasks, getTaskStats, getTaskById,
  createTask, updateTask, deleteTask,
} = require('../controllers/taskController');

const router = Router();

// All task routes require authentication
router.use(authenticate);

const taskRules = [
  body('title').trim().notEmpty().withMessage('Task title is required.'),
  body('project_id').isInt({ min: 1 }).withMessage('Valid project_id is required.'),
];

// GET /api/tasks/stats  — dashboard statistics
router.get('/stats', getTaskStats);

// GET /api/tasks  — list tasks (filtered by role)
router.get('/', getTasks);

// GET /api/tasks/:id
router.get('/:id', getTaskById);

// POST /api/tasks  [Admin]
router.post('/', requireAdmin, taskRules, createTask);

// PUT /api/tasks/:id  — Admin: full edit; Member: status only
router.put('/:id', updateTask);

// DELETE /api/tasks/:id  [Admin]
router.delete('/:id', requireAdmin, deleteTask);

module.exports = router;