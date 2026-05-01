const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

const router = Router();

/**
 * POST /api/dev/seed
 * DEVELOPMENT ONLY: Creates test data
 * ⚠️  This endpoint should be removed or protected in production
 */
router.post('/seed', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Seed endpoint disabled in production.' });
  }

  const db = getDb();

  try {
    // Clear existing data
    db.exec('DELETE FROM tasks;');
    db.exec('DELETE FROM project_members;');
    db.exec('DELETE FROM projects;');
    db.exec('DELETE FROM users;');

    // Create users
    const users = [
      { name: 'Admin User', email: 'admin@test.com', password: 'admin123', role: 'admin' },
      { name: 'John Doe', email: 'john@test.com', password: 'john123', role: 'member' },
      { name: 'Jane Smith', email: 'jane@test.com', password: 'jane123', role: 'member' },
      { name: 'Bob Wilson', email: 'bob@test.com', password: 'bob123', role: 'member' },
    ];

    const createdUsers = [];
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      const result = db.prepare(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run(user.name, user.email, passwordHash, user.role);
      createdUsers.push({ id: result.lastInsertRowid, ...user });
    }

    // Create projects
    const projectResult1 = db.prepare(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)'
    ).run('Website Redesign', 'Modernize the company website with new UI/UX', createdUsers[0].id);

    const projectResult2 = db.prepare(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)'
    ).run('Mobile App Dev', 'Build iOS and Android mobile applications', createdUsers[0].id);

    const projectIds = [projectResult1.lastInsertRowid, projectResult2.lastInsertRowid];

    // Add members to projects
    const members = [
      [projectIds[0], createdUsers[0].id], // Admin to project 1
      [projectIds[0], createdUsers[1].id], // John to project 1
      [projectIds[0], createdUsers[2].id], // Jane to project 1
      [projectIds[1], createdUsers[0].id], // Admin to project 2
      [projectIds[1], createdUsers[2].id], // Jane to project 2
      [projectIds[1], createdUsers[3].id], // Bob to project 2
    ];

    for (const [projectId, userId] of members) {
      db.prepare(
        'INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)'
      ).run(projectId, userId);
    }

    // Create tasks
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 604800000).toISOString().split('T')[0];

    const tasks = [
      { projectId: projectIds[0], title: 'Design mockups', description: 'Create high-fidelity UI mockups', assignedTo: createdUsers[2].id, status: 'in_progress', dueDate: tomorrow },
      { projectId: projectIds[0], title: 'Setup development environment', description: 'Configure dev tools and dependencies', assignedTo: createdUsers[1].id, status: 'completed', dueDate: today },
      { projectId: projectIds[0], title: 'Code review process', description: 'Establish PR review guidelines', assignedTo: createdUsers[0].id, status: 'pending', dueDate: nextWeek },
      { projectId: projectIds[1], title: 'API integration', description: 'Connect to backend REST APIs', assignedTo: createdUsers[3].id, status: 'pending', dueDate: nextWeek },
      { projectId: projectIds[1], title: 'Database schema', description: 'Design and optimize database', assignedTo: createdUsers[2].id, status: 'in_progress', dueDate: tomorrow },
    ];

    for (const task of tasks) {
      db.prepare(
        'INSERT INTO tasks (project_id, title, description, assigned_to, status, due_date) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(task.projectId, task.title, task.description, task.assignedTo, task.status, task.dueDate);
    }

    res.json({
      message: 'Test data created successfully!',
      data: {
        users: createdUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
        projects: projectIds,
        tasksCount: tasks.length,
      },
      credentials: {
        admin: { email: 'admin@test.com', password: 'admin123' },
        member: { email: 'john@test.com', password: 'john123' },
      },
    });
  } catch (err) {
    console.error('[seed]', err);
    res.status(500).json({ message: 'Failed to seed data.', error: err.message });
  }
});

module.exports = router;
