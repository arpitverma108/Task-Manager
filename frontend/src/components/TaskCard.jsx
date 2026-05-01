import { useState } from 'react';
import StatusBadge from './StatusBadge';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function TaskCard({ task, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();
  const effectiveStatus = isOverdue ? 'overdue' : task.status;

  const dueLabel = task.due_date
    ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  async function handleStatusChange(e) {
    setError('');
    setUpdating(true);
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { status: e.target.value });
      onUpdated?.(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setError('');
    try {
      await api.delete(`/tasks/${task.id}`);
      onDeleted?.(task.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  }

  return (
    <div className="task-card">
      <div className="task-card-header">
        <div>
          <div className="task-title">{task.title}</div>
          {task.project_name && (
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-light)', marginTop: '0.15rem' }}>
              📁 {task.project_name}
            </div>
          )}
        </div>
        <div className="task-actions">
          <StatusBadge status={effectiveStatus} />
        </div>
      </div>

      {task.description && <p className="task-desc">{task.description}</p>}

      <div className="task-meta">
        {task.assignee_name && (
          <span className="task-meta-item">👤 {task.assignee_name}</span>
        )}
        {dueLabel && (
          <span className={`task-meta-item ${isOverdue ? 'due-overdue' : ''}`}>
            🗓 {dueLabel}{isOverdue ? ' · Overdue' : ''}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}

      {(user?.role === 'admin' || task.assigned_to === user?.id) && task.status !== 'completed' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
          <select
            className="form-select"
            style={{ flex: 1, padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}
            value={task.status}
            onChange={handleStatusChange}
            disabled={updating}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          {user?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={updating}>🗑</button>
          )}
        </div>
      )}
    </div>
  );
}