const { validationResult } = require('express-validator');
const { getDb } = require('../config/db');

/**
 * GET /api/projects
 * Admin sees all projects. Member sees only projects they belong to.
 */
function getProjects(req, res) {
  try {
    const db = getDb();
    let projects;

    if (req.user.role === 'admin') {
      projects = db.prepare(`
        SELECT p.*, u.name as creator_name,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p
        JOIN users u ON u.id = p.created_by
        ORDER BY p.created_at DESC
      `).all();
    } else {
      projects = db.prepare(`
        SELECT p.*, u.name as creator_name,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p
        JOIN users u ON u.id = p.created_by
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user.id);
    }

    res.json(projects);
  } catch (err) {
    console.error('[getProjects]', err);
    res.status(500).json({ message: 'Failed to fetch projects.' });
  }
}

/**
 * GET /api/projects/:id
 * Returns a single project with its members and tasks.
 */
function getProjectById(req, res) {
  try {
    const db = getDb();
    const project = db.prepare(`
      SELECT p.*, u.name as creator_name
      FROM projects p JOIN users u ON u.id = p.created_by
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    // Access control: member must belong to the project
    if (req.user.role !== 'admin') {
      const membership = db.prepare(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);
      if (!membership) return res.status(403).json({ message: 'Access denied.' });
    }

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.role
      FROM users u JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(req.params.id);

    const tasks = db.prepare(`
      SELECT t.*, u.name as assignee_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `).all(req.params.id);

    res.json({ ...project, members, tasks });
  } catch (err) {
    console.error('[getProjectById]', err);
    res.status(500).json({ message: 'Failed to fetch project.' });
  }
}

/**
 * POST /api/projects  [Admin only]
 * Creates a new project and auto-adds the admin as a member.
 */
function createProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description } = req.body;
  const db = getDb();

  try {
    const result = db.prepare(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)'
    ).run(name, description || null, req.user.id);

    // Auto-add creator to project members
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)')
      .run(result.lastInsertRowid, req.user.id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (err) {
    console.error('[createProject]', err);
    res.status(500).json({ message: 'Failed to create project.' });
  }
}

/**
 * PUT /api/projects/:id  [Admin only]
 */
function updateProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description } = req.body;
  const db = getDb();

  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
      .run(name, description || null, req.params.id);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('[updateProject]', err);
    res.status(500).json({ message: 'Failed to update project.' });
  }
}

/**
 * DELETE /api/projects/:id  [Admin only]
 * Cascades to tasks and project_members via FK ON DELETE CASCADE.
 */
function deleteProject(req, res) {
  const db = getDb();
  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('[deleteProject]', err);
    res.status(500).json({ message: 'Failed to delete project.' });
  }
}

/**
 * GET /api/projects/:id/assignable-users
 * Returns users who can be assigned tasks in this project (project members).
 */
function getAssignableUsers(req, res) {
  try {
    const db = getDb();
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    // Access control: member must belong to the project
    if (req.user.role !== 'admin') {
      const membership = db.prepare(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);
      if (!membership) return res.status(403).json({ message: 'Access denied.' });
    }

    // Return all project members (users who can be assigned tasks)
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role
      FROM users u
      JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY u.name ASC
    `).all(req.params.id);

    res.json(users);
  } catch (err) {
    console.error('[getAssignableUsers]', err);
    res.status(500).json({ message: 'Failed to fetch assignable users.' });
  }
}

/**
 * POST /api/projects/:id/members  [Admin only]
 * Adds a user to a project.
 */
function addMember(req, res) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required.' });

  const db = getDb();
  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Check if user is already a member
    const existing = db.prepare(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.id, userId);

    if (existing) {
      return res.status(409).json({ message: 'User is already a member of this project.' });
    }

    db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)')
      .run(req.params.id, userId);

    res.json({ message: 'Member added successfully.' });
  } catch (err) {
    console.error('[addMember]', err);
    res.status(500).json({ message: 'Failed to add member.' });
  }
}

/**
 * DELETE /api/projects/:id/members/:userId  [Admin only]
 */
function removeMember(req, res) {
  const db = getDb();
  try {
    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
      .run(req.params.id, req.params.userId);
    res.json({ message: 'Member removed successfully.' });
  } catch (err) {
    console.error('[removeMember]', err);
    res.status(500).json({ message: 'Failed to remove member.' });
  }
}

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject, addMember, removeMember, getAssignableUsers };
