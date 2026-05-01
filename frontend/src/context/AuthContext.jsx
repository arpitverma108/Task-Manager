import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ttm_token'));
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, fetch the current user profile
  useEffect(() => {
    if (token) {
      api.get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => {
          // Token invalid / expired — clear it
          localStorage.removeItem('ttm_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  /** Call after successful login/signup */
  function login(tokenValue, userData) {
    localStorage.setItem('ttm_token', tokenValue);
    setToken(tokenValue);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('ttm_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}