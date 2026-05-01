import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_to: '', status: 'pending', due_date: '' });
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  const fetchProject = useCallback(async () => {
    const { data } = await api.get(`/projects/${id}`);
    setProject(data);
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await fetchProject();
        if (user?.role === 'admin') {
          const { data } = await api.get('/users');
          setAllUsers(data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load project.');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProject, user]);

  // ── Task handlers ──────────────────────────────────────────────
  function openCreateTask() {
    setEditTask(null);
    setTaskForm({ title: '', description: '', assigned_to: '', status: 'pending', due_date: '' });
    setTaskError('');
    setShowTaskModal(true);
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    if (!taskForm.title.trim()) { setTaskError('Title is required.'); return; }
    setSavingTask(true); setTaskError('');
    try {
      const payload = { ...taskForm, project_id: Number(id), assigned_to: taskForm.assigned_to || null };
      if (editTask) {
        const { data } = await api.put(`/tasks/${editTask.id}`, payload);
        setProject(p => ({ ...p, tasks: p.tasks.map(t => t.id === data.id ? data : t) }));
      } else {
        const { data } = await api.post('/tasks', payload);
        setProject(p => ({ ...p, tasks: [data, ...p.tasks] }));
      }
      setShowTaskModal(false);
    } catch (err) {
      setTaskError(err.response?.data?.message || 'Failed to save task.');
    } finally { setSavingTask(false); }
  }

  // ── Member handlers ────────────────────────────────────────────
  async function handleAddMember(e) {
    e.preventDefault();
    if (!selectedUserId) return;
    setSavingMember(true);
    try {
      await api.post(`/projects/${id}/members`, { userId: selectedUserId });
      await fetchProject();
      setShowMemberModal(false); setSelectedUserId('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member.');
    } finally { setSavingMember(false); }
  }

  async function handleRemoveMember(uid) {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${uid}`);
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== uid) }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div><Link to="/projects" className="btn btn-secondary" style={{marginTop:'1rem'}}>← Back</Link></div>;

  const nonMembers = allUsers.filter(u => !project.members.find(m => m.id === u.id));
  const initials = n => n?.split(' ').map(x => x[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <div className="page">
      <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1rem' }}>
        <Link to="/projects" style={{ color:'var(--accent-light)', textDecoration:'none' }}>Projects</Link> / {project.name}
      </div>

      <div className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        <div><h1>{project.name}</h1>{project.description && <p>{project.description}</p>}</div>
        {user?.role === 'admin' && (
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}>👥 Members</button>
            <button className="btn btn-primary" onClick={openCreateTask}>+ New Task</button>
          </div>
        )}
      </div>

      {/* Members chips */}
      <div className="card" style={{ marginBottom:'1.75rem' }}>
        <div style={{ fontWeight:'600', marginBottom:'0.75rem' }}>👥 Members ({project.members.length})</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
          {project.members.map(m => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'var(--bg-card-hover)', border:'1px solid var(--border)', borderRadius:'999px', padding:'0.25rem 0.75rem 0.25rem 0.35rem', fontSize:'0.83rem' }}>
              <div className="member-avatar" style={{ width:'24px', height:'24px', fontSize:'0.65rem' }}>{initials(m.name)}</div>
              <span>{m.name}</span>
              <span className={`role-badge ${m.role}`}>{m.role}</span>
              {user?.role === 'admin' && m.id !== user.id && (
                <button onClick={() => handleRemoveMember(m.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', lineHeight:1 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div style={{ fontWeight:'600', fontSize:'1rem', marginBottom:'1rem' }}>Tasks ({project.tasks.length})</div>
      {project.tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>No tasks yet.{user?.role === 'admin' && ' Create the first one!'}</p>
          {user?.role === 'admin' && <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={openCreateTask}>Create Task</button>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {project.tasks.map(task => (
            <TaskCard key={task.id} task={task}
              onUpdated={t => setProject(p => ({ ...p, tasks: p.tasks.map(x => x.id === t.id ? t : x) }))}
              onDeleted={tid => setProject(p => ({ ...p, tasks: p.tasks.filter(x => x.id !== tid) }))}
            />
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            {taskError && <div className="alert alert-error">{taskError}</div>}
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={taskForm.title} onChange={e => setTaskForm(f=>({...f,title:e.target.value}))} placeholder="Task title" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={taskForm.description} onChange={e => setTaskForm(f=>({...f,description:e.target.value}))} placeholder="Optional details…" />
              </div>
              <div className="form-group">
                <label className="form-label">Assign to</label>
                <select className="form-select" value={taskForm.assigned_to} onChange={e => setTaskForm(f=>({...f,assigned_to:e.target.value}))}>
                  <option value="">— Unassigned —</option>
                  {project.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={taskForm.status} onChange={e => setTaskForm(f=>({...f,status:e.target.value}))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={taskForm.due_date} onChange={e => setTaskForm(f=>({...f,due_date:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingTask}>{savingTask ? 'Saving…' : editTask ? 'Save Changes' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMemberModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Manage Members</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            {nonMembers.length > 0 && (
              <form onSubmit={handleAddMember} style={{ marginBottom:'1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Add member</label>
                  <select className="form-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                    <option value="">— Select user —</option>
                    {nonMembers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!selectedUserId || savingMember}>{savingMember ? 'Adding…' : 'Add Member'}</button>
              </form>
            )}
            <div style={{ fontWeight:'600', fontSize:'0.88rem', color:'var(--text-secondary)', marginBottom:'0.5rem' }}>Current Members</div>
            <div className="members-list">
              {project.members.map(m => (
                <div key={m.id} className="member-item">
                  <div className="member-info">
                    <div className="member-avatar">{initials(m.name)}</div>
                    <div><div style={{ fontWeight:'500', fontSize:'0.9rem' }}>{m.name}</div><div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{m.email}</div></div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <span className={`role-badge ${m.role}`}>{m.role}</span>
                    {m.id !== user.id && <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
