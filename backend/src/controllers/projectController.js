const { validationResult } = require('express-validator');
const { getDb } = require('../config/db');

/**
 * GET /api/projects
 * Admin sees all projects. Member sees only projects they belong to.
 */
async function getProjects(req, res) {
  try {
    const db = getDb();
    let projects;

    if (req.user.role === 'admin') {
      projects = await db.prepare(`
        SELECT p.*, u.name as creator_name,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p
        JOIN users u ON u.id = p.created_by
        ORDER BY p.created_at DESC
      `).all();
    } else {
      projects = await db.prepare(`
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
async function getProjectById(req, res) {
  try {
    const db = getDb();
    const project = await db.prepare(`
      SELECT p.*, u.name as creator_name
      FROM projects p JOIN users u ON u.id = p.created_by
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    // Access control: member must belong to the project
    if (req.user.role !== 'admin') {
      const membership = await db.prepare(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);
      if (!membership) return res.status(403).json({ message: 'Access denied.' });
    }

    const members = await db.prepare(`
      SELECT u.id, u.name, u.email, u.role
      FROM users u JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(req.params.id);

    const tasks = await db.prepare(`
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
async function createProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description } = req.body;
  const db = getDb();

  try {
    const result = await db.prepare(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?) RETURNING id'
    ).run(name, description || null, req.user.id);

    // Auto-add creator to project members
    await db.prepare(
      'INSERT INTO project_members (project_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
    ).run(result.lastInsertRowid, req.user.id);

    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (err) {
    console.error('[createProject]', err);
    res.status(500).json({ message: 'Failed to create project.' });
  }
}

/**
 * PUT /api/projects/:id  [Admin only]
 */
async function updateProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description } = req.body;
  const db = getDb();

  try {
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    await db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
      .run(name, description || null, req.params.id);

    const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
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
async function deleteProject(req, res) {
  const db = getDb();
  try {
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    await db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('[deleteProject]', err);
    res.status(500).json({ message: 'Failed to delete project.' });
  }
}

/**
 * GET /api/projects/:id/assignable-users
 */
async function getAssignableUsers(req, res) {
  try {
    const db = getDb();
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    if (req.user.role !== 'admin') {
      const membership = await db.prepare(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);
      if (!membership) return res.status(403).json({ message: 'Access denied.' });
    }

    const users = await db.prepare(`
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
 */
async function addMember(req, res) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required.' });

  const db = getDb();
  try {
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const existing = await db.prepare(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.id, userId);

    if (existing) {
      return res.status(409).json({ message: 'User is already a member of this project.' });
    }

    await db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)')
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
async function removeMember(req, res) {
  const db = getDb();
  try {
    await db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
      .run(req.params.id, req.params.userId);
    res.json({ message: 'Member removed successfully.' });
  } catch (err) {
    console.error('[removeMember]', err);
    res.status(500).json({ message: 'Failed to remove member.' });
  }
}

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject, addMember, removeMember, getAssignableUsers };