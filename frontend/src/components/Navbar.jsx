import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <nav className="navbar">
      {/* Brand */}
      <NavLink to="/dashboard" className="navbar-brand">
        <span className="brand-icon">✦</span>
        <span>TaskFlow</span>
      </NavLink>

      {/* Navigation links */}
      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span>📊</span><span> Dashboard</span>
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span>📁</span><span> Projects</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span>✅</span><span> Tasks</span>
        </NavLink>
      </div>

      {/* User info + logout */}
      <div className="navbar-right">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <span>{user?.name}</span>
          <span className={`role-badge ${user?.role}`}>{user?.role}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}