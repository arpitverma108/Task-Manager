import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]); // members of selected project
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', project_id: '', assigned_to: '', status: 'pending', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    const url = filter === 'all' ? '/tasks' : `/tasks?status=${filter}`;
    const { data } = await api.get(url);
    setTasks(data);
  }, [filter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        await fetchTasks();
        if (user?.role === 'admin') {
          const { data: projs } = await api.get('/projects');
          setProjects(projs);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load tasks.');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchTasks, user]);

  // When project selection changes, fetch that project's members
  async function handleProjectChange(projectId) {
    setForm(f => ({ ...f, project_id: projectId, assigned_to: '' }));
    setProjectMembers([]);
    if (!projectId) return;
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProjectMembers(data.members || []);
    } catch {
      setProjectMembers([]);
    }
  }

  function openCreate() {
    setForm({ title: '', description: '', project_id: '', assigned_to: '', status: 'pending', due_date: '' });
    setProjectMembers([]);
    setFormError('');
    setShowModal(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.project_id)   { setFormError('Please select a project.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { ...form, project_id: Number(form.project_id), assigned_to: form.assigned_to || null };
      const { data } = await api.post('/tasks', payload);
      setTasks(ts => [data, ...ts]);
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create task.');
    } finally { setSaving(false); }
  }

  function handleTaskUpdated(updated) { setTasks(ts => ts.map(t => t.id === updated.id ? updated : t)); }
  function handleTaskDeleted(id)      { setTasks(ts => ts.filter(t => t.id !== id)); }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Tasks</h1>
          <p>{user?.role === 'admin' ? 'All tasks across every project' : 'Tasks assigned to you'}</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
        )}
      </div>

      <div className="filter-bar">
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No tasks found{filter !== 'all' ? ` with status "${filter.replace('_', ' ')}"` : ''}.</p>
          {user?.role === 'admin' && (
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openCreate}>Create a task</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onUpdated={handleTaskUpdated} onDeleted={handleTaskDeleted} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Task</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Task title" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details…" />
              </div>
              <div className="form-group">
                <label className="form-label">Project *</label>
                <select className="form-select" value={form.project_id}
                  onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">— Select project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to</label>
                <select className="form-select" value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  disabled={!form.project_id}>
                  <option value="">— Unassigned —</option>
                  {projectMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}