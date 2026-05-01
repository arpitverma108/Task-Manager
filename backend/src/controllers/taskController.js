const { validationResult } = require('express-validator');
const { getDb, getPool } = require('../config/db');

/**
 * GET /api/tasks
 * Uses getPool() directly for dynamic WHERE clause building with $N params.
 */
async function getTasks(req, res) {
  try {
    const pool = getPool();
    const { projectId, status } = req.query;

    const conditions = [];
    const params = [];

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      conditions.push(`t.assigned_to = $${params.length}`);
    }
    if (projectId) {
      params.push(projectId);
      conditions.push(`t.project_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id
      ${where}
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[getTasks]', err);
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
}

/**
 * GET /api/tasks/stats
 */
async function getTaskStats(req, res) {
  try {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];
    const isAdmin = req.user.role === 'admin';
    const base = isAdmin ? [] : [req.user.id];
    const w    = isAdmin ? '' : 'WHERE assigned_to = $1';
    const and  = isAdmin ? 'WHERE' : 'AND';

    const q = (sql, p) => pool.query(sql, p).then(r => Number(r.rows[0].count));

    const [total, completed, pending, inProgress, overdue] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM tasks ${w}`, base),
      q(`SELECT COUNT(*) as count FROM tasks ${w} ${w ? 'AND' : 'WHERE'} status='completed'`, base),
      q(`SELECT COUNT(*) as count FROM tasks ${w} ${w ? 'AND' : 'WHERE'} status='pending'`, base),
      q(`SELECT COUNT(*) as count FROM tasks ${w} ${w ? 'AND' : 'WHERE'} status='in_progress'`, base),
      q(`SELECT COUNT(*) as count FROM tasks ${w} ${w ? 'AND' : 'WHERE'} status!='completed' AND due_date < $${base.length + 1}`,
        [...base, today]),
    ]);

    res.json({ total, completed, pending, inProgress, overdue });
  } catch (err) {
    console.error('[getTaskStats]', err);
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
}

/** GET /api/tasks/:id */
async function getTaskById(req, res) {
  try {
    const db = getDb();
    const task = await db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id)
      return res.status(403).json({ message: 'Access denied.' });

    res.json(task);
  } catch (err) {
    console.error('[getTaskById]', err);
    res.status(500).json({ message: 'Failed to fetch task.' });
  }
}

/** POST /api/tasks  [Admin only] */
async function createTask(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { project_id, title, description, assigned_to, status, due_date } = req.body;
  const db = getDb();

  try {
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const result = await db.prepare(`
      INSERT INTO tasks (project_id, title, description, assigned_to, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `).run(project_id, title, description || null, assigned_to || null, status || 'pending', due_date || null);

    const task = await db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(task);
  } catch (err) {
    console.error('[createTask]', err);
    res.status(500).json({ message: 'Failed to create task.' });
  }
}

/** PUT /api/tasks/:id */
async function updateTask(req, res) {
  const db = getDb();
  try {
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    if (req.user.role === 'member') {
      if (task.assigned_to !== req.user.id) return res.status(403).json({ message: 'Access denied.' });
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'Only status can be updated.' });
      if (!['pending','in_progress','completed'].includes(status))
        return res.status(400).json({ message: 'Invalid status.' });
      await db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
    } else {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
      const { title, description, assigned_to, status, due_date } = req.body;
      await db.prepare(`
        UPDATE tasks SET title=?, description=?, assigned_to=?, status=?, due_date=? WHERE id=?
      `).run(
        title ?? task.title, description ?? task.description,
        assigned_to ?? task.assigned_to, status ?? task.status,
        due_date ?? task.due_date, req.params.id
      );
    }

    const updated = await db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN projects p ON p.id = t.project_id WHERE t.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('[updateTask]', err);
    res.status(500).json({ message: 'Failed to update task.' });
  }
}

/** DELETE /api/tasks/:id  [Admin only] */
async function deleteTask(req, res) {
  const db = getDb();
  try {
    const task = await db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('[deleteTask]', err);
    res.status(500).json({ message: 'Failed to delete task.' });
  }
}

module.exports = { getTasks, getTaskStats, getTaskById, createTask, updateTask, deleteTask };