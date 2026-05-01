import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';

export default function App() {
  const { user, loading } = useAuth();

  // Block rendering until the auth check resolves — prevents route flicker
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <main className={user ? 'main-with-nav' : ''}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={!user ? <Login />  : <Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" replace />} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/projects"       element={<Projects />} />
            <Route path="/projects/:id"   element={<ProjectDetail />} />
            <Route path="/tasks"          element={<Tasks />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
    </>
  );
}