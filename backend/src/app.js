const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const devRoutes = require('./routes/dev');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ── Security headers ────────────────────────────────────────────────────────
// Relax CSP when serving the React SPA so inline scripts/styles work
app.use(helmet({
  contentSecurityPolicy: false,
}));

// ── CORS ────────────────────────────────────────────────────────────────────
// In production we serve the frontend from the same origin, so CORS is only
// needed for external clients (Postman, mobile apps, etc.).
// We keep the CORS middleware but allow same-origin requests through.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // non-browser / curl / Postman
    if (!isProduction) return callback(null, true); // dev: allow all
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Rejected origin: ${origin}`);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Rate limiting on auth routes ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

if (!isProduction) {
  app.use('/api/dev', devRoutes);
}

// ── Serve React frontend in production ──────────────────────────────────────
// The frontend is built to ../frontend/dist relative to this file's location
// (backend/src/app.js → backend/../frontend/dist)
if (isProduction) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  // React Router: send index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // ── 404 handler (dev only — in prod the SPA catch-all handles it) ─────────
  app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
}

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    status,
    stack: err.stack,
    path: _req.path,
    method: _req.method,
  });

  if (isProduction) {
    res.status(status).json({
      message: status === 404 ? 'Not found' : 'Internal server error',
    });
  } else {
    res.status(status).json({
      message: err.message || 'Internal server error',
      ...(err.details && { details: err.details }),
    });
  }
});

module.exports = app;