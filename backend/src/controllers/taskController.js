const { validationResult } = require('express-validator');
const { getDb } = require('../config/db');

/**
 * GET /api/tasks
 * Query params: projectId, status
 * Admin: sees all tasks (optionally filtered).
 * Member: sees only tasks assigned to them.
 */
function getTasks(req, res) {
  try {
    const db = getDb();
    const { projectId, status } = req.query;

    let query = `
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE 1=1
    `;
    const params = [];

    // Members only see their own tasks
    if (req.user.role !== 'admin') {
      query += ' AND t.assigned_to = ?';
      params.push(req.user.id);
    }

    if (projectId) {
      query += ' AND t.project_id = ?';
      params.push(projectId);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.due_date ASC, t.created_at DESC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error('[getTasks]', err);
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
}

/**
 * GET /api/tasks/stats
 * Returns dashboard statistics for the current user.
 */
function getTaskStats(req, res) {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    let baseWhere = req.user.role === 'admin' ? '1=1' : 'assigned_to = ?';
    const param = req.user.role === 'admin' ? [] : [req.user.id];

    const total = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${baseWhere}`).get(...param).count;
    const completed = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${baseWhere} AND status = 'completed'`).get(...param).count;
    const pending = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${baseWhere} AND status = 'pending'`).get(...param).count;
    const inProgress = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${baseWhere} AND status = 'in_progress'`).get(...param).count;
    const overdue = db.prepare(
      `SELECT COUNT(*) as count FROM tasks WHERE ${baseWhere} AND status != 'completed' AND due_date < ?`
    ).get(...param, today).count;

    res.json({ total, completed, pending, inProgress, overdue });
  } catch (err) {
    console.error('[getTaskStats]', err);
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
}

/**
 * GET /api/tasks/:id
 */
function getTaskById(req, res) {
  try {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task not found.' });

    // Members can only view their own tasks
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(task);
  } catch (err) {
    console.error('[getTaskById]', err);
    res.status(500).json({ message: 'Failed to fetch task.' });
  }
}

/**
 * POST /api/tasks  [Admin only]
 * Creates a new task under a project.
 */
function createTask(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { project_id, title, description, assigned_to, status, due_date } = req.body;
  const db = getDb();

  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const result = db.prepare(`
      INSERT INTO tasks (project_id, title, description, assigned_to, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(project_id, title, description || null, assigned_to || null, status || 'pending', due_date || null);

    const task = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(task);
  } catch (err) {
    console.error('[createTask]', err);
    res.status(500).json({ message: 'Failed to create task.' });
  }
}

/**
 * PUT /api/tasks/:id
 * Admin: can update all fields.
 * Member: can only update status of their own assigned task.
 */
function updateTask(req, res) {
  const db = getDb();
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    if (req.user.role === 'member') {
      // Members can only update status of their own tasks
      if (task.assigned_to !== req.user.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'Only status can be updated.' });
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

      db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
    } else {
      // Admin: full update
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

      const { title, description, assigned_to, status, due_date } = req.body;
      db.prepare(`
        UPDATE tasks SET title = ?, description = ?, assigned_to = ?, status = ?, due_date = ?
        WHERE id = ?
      `).run(
        title ?? task.title,
        description ?? task.description,
        assigned_to ?? task.assigned_to,
        status ?? task.status,
        due_date ?? task.due_date,
        req.params.id
      );
    }

    const updated = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('[updateTask]', err);
    res.status(500).json({ message: 'Failed to update task.' });
  }
}

/**
 * DELETE /api/tasks/:id  [Admin only]
 */
function deleteTask(req, res) {
  const db = getDb();
  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('[deleteTask]', err);
    res.status(500).json({ message: 'Failed to delete task.' });
  }
}

module.exports = { getTasks, getTaskStats, getTaskById, createTask, updateTask, deleteTask };