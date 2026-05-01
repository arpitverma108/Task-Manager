import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';

const FILTERS = [
  { key: 'all',         label: 'All Tasks' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'overdue',     label: 'Overdue' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [tasks, setTasks]   = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const { data } = await api.get('/tasks/stats');
    setStats(data);
  }, []);

  const fetchTasks = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    let url = '/tasks?';
    if (filter === 'overdue') {
      // Fetch non-completed tasks and filter client-side by due_date < today
      const { data } = await api.get('/tasks');
      setTasks(data.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today));
      return;
    }
    if (filter !== 'all') url += `status=${filter}`;
    const { data } = await api.get(url);
    setTasks(data);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchStats(), fetchTasks()])
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, [fetchStats, fetchTasks]);

  function handleTaskUpdated(updated) {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
    fetchStats();
  }

  function handleTaskDeleted(id) {
    setTasks(ts => ts.filter(t => t.id !== id));
    fetchStats();
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, <strong>{user?.name}</strong> — here's your overview</p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/tasks" className="btn btn-primary">+ New Task</Link>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Tasks</div>
            </div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card stat-inprogress">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: 'var(--info)' }}>{stats.inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="stat-card stat-overdue">
            <div className="stat-icon">🚨</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div>No tasks found for this filter.</div>
          {user?.role === 'admin' && (
            <Link to="/tasks" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create a task</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdated={handleTaskUpdated}
              onDeleted={handleTaskDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}