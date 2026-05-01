import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // project being edited
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ name: '', description: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(e, project) {
    e.preventDefault(); // stop link navigation
    setEditTarget(project);
    setForm({ name: project.name, description: project.description || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        const { data } = await api.put(`/projects/${editTarget.id}`, form);
        setProjects(ps => ps.map(p => p.id === data.id ? { ...p, ...data } : p));
      } else {
        const { data } = await api.post('/projects', form);
        setProjects(ps => [data, ...ps]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, id) {
    e.preventDefault();
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(ps => ps.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Projects</h1>
          <p>{user?.role === 'admin' ? 'Manage all team projects' : 'Projects you are a member of'}</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={openCreate}>+ New Project</button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div>{user?.role === 'admin' ? 'No projects yet. Create your first one!' : 'You haven\'t been added to any projects yet.'}</div>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              {/* Gradient top bar */}
              <div style={{ height: '4px', borderRadius: '4px', background: 'linear-gradient(90deg, var(--accent), var(--info))', marginBottom: '0.25rem' }} />
              <div className="project-card-title">{p.name}</div>
              {p.description && <div className="project-card-desc">{p.description}</div>}
              <div className="project-card-footer">
                <span className="project-stat">📋 {p.task_count} tasks</span>
                <span className="project-stat">👥 {p.member_count} members</span>
                {user?.role === 'admin' && (
                  <div className="project-actions">
                    <button className="btn btn-secondary btn-sm" onClick={e => openEdit(e, p)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={e => handleDelete(e, p.id)}>🗑</button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editTarget ? 'Edit Project' : 'New Project'}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" htmlFor="proj-name">Project Name *</label>
                <input id="proj-name" className="form-input" type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Website Redesign" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="proj-desc">Description</label>
                <textarea id="proj-desc" className="form-textarea" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief project description…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}