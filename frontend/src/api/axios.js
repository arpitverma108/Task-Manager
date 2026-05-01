import axios from 'axios';

// In development: VITE_API_URL is empty, Vite proxy handles /api → localhost:5000
// In production (Vercel): set VITE_API_URL to your Railway backend URL
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  // ✅ FIX: Must be false. This app uses JWT via Authorization header, NOT cookies.
  // withCredentials:true + non-wildcard CORS origin causes browsers to block all requests.
  withCredentials: false,
});

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ttm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — redirect to login EXCEPT during the initial
// profile fetch (/users/me), which handles its own 401 in AuthContext.
api.interceptors.response.use(
  res => res,
  err => {
    const is401 = err.response?.status === 401;
    const isProfileCheck = err.config?.url?.includes('/users/me');

    if (is401 && !isProfileCheck) {
      localStorage.removeItem('ttm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;