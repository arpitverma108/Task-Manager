const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const {
  getProjects, getProjectById, createProject, updateProject,
  deleteProject, addMember, removeMember, getAssignableUsers,
} = require('../controllers/projectController');

const router = Router();

// All project routes require authentication
router.use(authenticate);

const projectRules = [
  body('name').trim().notEmpty().withMessage('Project name is required.'),
];

// GET /api/projects
router.get('/', getProjects);

// GET /api/projects/:id
router.get('/:id', getProjectById);

// POST /api/projects  [Admin]
router.post('/', requireAdmin, projectRules, createProject);

// PUT /api/projects/:id  [Admin]
router.put('/:id', requireAdmin, projectRules, updateProject);

// DELETE /api/projects/:id  [Admin]
router.delete('/:id', requireAdmin, deleteProject);

// GET /api/projects/:id/assignable-users
router.get('/:id/assignable-users', getAssignableUsers);

// POST /api/projects/:id/members  [Admin]
router.post('/:id/members', requireAdmin, addMember);

// DELETE /api/projects/:id/members/:userId  [Admin]
router.delete('/:id/members/:userId', requireAdmin, removeMember);

module.exports = router;
