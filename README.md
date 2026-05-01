<div align="center">

# ✦ TaskFlow — Team Task Manager

**A production-ready full-stack task management application with role-based access control**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sql.js.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Tech Stack](#-tech-stack)
- [Architecture](#️-architecture)
- [Features](#-features)
- [Database Schema](#️-database-schema)
- [API Reference](#-api-reference)
- [Role & Permission Model](#-role--permission-model)
- [Project Structure](#-project-structure)
- [Local Setup](#-local-setup)
- [Environment Variables](#-environment-variables)
- [Production Deployment](#-production-deployment)
- [Security](#-security)
- [Known Issues & Limitations](#️-known-issues--limitations)
- [Design Decisions](#-design-decisions)

---

## 🔍 Overview

TaskFlow is a multi-user task management platform built for teams. It implements a two-tier role system — **Admin** and **Member** — with strict server-side access control. Admins manage the full project and task lifecycle; Members see and update only what's assigned to them.

The application was built as a full-stack take-home assessment demonstrating:

- JWT-based authentication with per-request DB verification (no stale role caching)
- Role-based access control enforced at both API middleware and controller layers
- Relational data modelling with cascading deletes (project → members → tasks)
- A dark-mode UI with a glassmorphism design system built from scratch in vanilla CSS
- CORS, Helmet security headers, and rate limiting on auth endpoints
- Development seed endpoint for instant test-data population

---

## 🚀 Live Demo

> **Backend API:** `http://localhost:5000`
> **Frontend UI:** `http://localhost:5173`

**Quick test credentials** (after seeding — see [Local Setup](#-local-setup)):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@test.com` | `admin123` |
| Member | `john@test.com` | `john123` |
| Member | `jane@test.com` | `jane123` |
| Member | `bob@test.com` | `bob123` |

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.x | HTTP framework |
| sql.js | 1.12 | SQLite database (WASM, zero native compilation) |
| jsonwebtoken | 9.x | JWT creation and verification |
| bcryptjs | 2.4 | Password hashing (cost factor 12) |
| express-validator | 7.x | Input validation and sanitisation |
| helmet | 7.x | HTTP security headers |
| cors | 2.8 | Cross-Origin Resource Sharing |
| express-rate-limit | 7.x | Brute-force protection on auth routes |
| dotenv | 16.x | Environment variable loading |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI library |
| Vite | 5.x | Build tool and dev server |
| React Router | 6.x | Client-side routing |
| Axios | 1.6 | HTTP client with interceptors |
| Vanilla CSS | — | Custom dark-mode design system |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   React 18 + Vite    →    Axios (JWT header)            │
│   React Router v6         Response interceptors         │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (dev: Vite proxy → :5000)
                      │ HTTP (prod: direct to backend URL)
┌─────────────────────▼───────────────────────────────────┐
│                     Express API (:5000)                  │
│                                                         │
│  Helmet → CORS → Rate Limit → Routes                   │
│                                                         │
│  /api/auth     →  authController   (public)            │
│  /api/users    →  userController   (authenticated)     │
│  /api/projects →  projectController (role-gated)       │
│  /api/tasks    →  taskController   (role-gated)        │
│  /api/dev      →  dev seed         (dev only)          │
│                                                         │
│  authenticate middleware → JWT verify → DB user lookup │
│  requireAdmin middleware → role check                  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              sql.js SQLite Database                      │
│           (WASM in-memory + disk persistence)           │
│                                                         │
│   users · projects · project_members · tasks           │
└─────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **No session store** — stateless JWT; every request re-fetches the user from DB to catch role changes
- **WASM SQLite** — sql.js requires zero native addons, making it portable across all platforms and CI environments
- **Vite dev proxy** — in development, `VITE_API_URL` is left empty and all `/api` calls proxy to `:5000`, eliminating any CORS concern locally
- **Seed route** — `/api/dev/seed` is only mounted when `NODE_ENV !== 'production'`, so it is impossible to call in a production build

---

## ✨ Features

### Authentication
- ✅ Sign-up and login with email/password
- ✅ JWT issued on successful auth (7-day expiry by default)
- ✅ Token stored in `localStorage`, attached to every request via Axios interceptor
- ✅ Global 401 interceptor auto-redirects to `/login` on token expiry
- ✅ First registered user is automatically promoted to **Admin**

### Role-Based Access Control
- ✅ Two roles: **Admin** and **Member**
- ✅ Role enforced at the middleware layer (`requireAdmin`)
- ✅ Members see only tasks assigned to them; admins see everything
- ✅ Members can update the status of their own tasks only
- ✅ Admin-only operations: create/edit/delete projects, create/delete tasks, manage members

### Project Management
- ✅ Create, edit, and delete projects (Admin)
- ✅ Add and remove project members (Admin)
- ✅ Creator is auto-added as a project member on creation
- ✅ Members see only projects they belong to
- ✅ Project detail view shows members and all project tasks
- ✅ Assignable users list scoped to project members (`/assignable-users` endpoint)

### Task Management
- ✅ Create tasks with title, description, assignee, status, and due date (Admin)
- ✅ Status workflow: `pending` → `in_progress` → `completed`
- ✅ Overdue detection: tasks past their due date are flagged visually
- ✅ Dashboard filter bar: All / Pending / In Progress / Completed / Overdue
- ✅ Task delete with confirmation dialog (Admin)
- ✅ Real-time stat counter refresh after task actions

### Dashboard
- ✅ Live stat cards: Total, Completed, In Progress, Pending, Overdue
- ✅ Filterable task list
- ✅ Role-aware: admins see all tasks; members see only their own

### Security & Reliability
- ✅ `bcrypt` password hashing with cost factor 12
- ✅ JWT secret validated on startup; warns if weak in production
- ✅ Helmet security headers on every response
- ✅ CORS: development allows all origins; production restricts to `CLIENT_URL`
- ✅ Rate limiting: 20 auth requests per IP per 15 minutes
- ✅ Input validation on all write endpoints via `express-validator`
- ✅ Graceful shutdown on `SIGTERM`

---

## 🗃️ Database Schema

```
┌──────────────────────────────────────────────────────────────────┐
│  users                                                           │
│  id · name · email (UNIQUE) · password_hash · role · created_at │
└────────────────────────┬─────────────────────────────────────────┘
                         │ created_by (FK)
┌────────────────────────▼─────────────────────────────────────────┐
│  projects                                                        │
│  id · name · description · created_by · created_at              │
└──────────┬──────────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────────┐
    │                                                  │
    │  project_members (join table)                   │
    │  project_id (FK, CASCADE) · user_id (FK, CASCADE)│
    │  PK: (project_id, user_id)                      │
    │                                                  │
    └──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│  tasks                                                          │
│  id · project_id (FK, CASCADE) · title · description           │
│  assigned_to (FK) · status · due_date · created_at             │
└─────────────────────────────────────────────────────────────────┘
```

**Constraints:**
- `role` CHECK: `'admin'` | `'member'`
- `status` CHECK: `'pending'` | `'in_progress'` | `'completed'`
- Deleting a project cascades to `project_members` and `tasks`
- Foreign keys enabled via `PRAGMA foreign_keys = ON`

---

## 📡 API Reference

All protected routes require: `Authorization: Bearer <token>`

### Auth — Public

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/auth/signup` | `{ name, email, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `{ token, user }` |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users` | Admin | List all users |
| `GET` | `/api/users/me` | Authenticated | Current user's profile |

### Projects

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/projects` | Authenticated | List projects (role-filtered) |
| `GET` | `/api/projects/:id` | Authenticated | Project + members + tasks |
| `POST` | `/api/projects` | Admin | Create project |
| `PUT` | `/api/projects/:id` | Admin | Update project |
| `DELETE` | `/api/projects/:id` | Admin | Delete project (cascades) |
| `GET` | `/api/projects/:id/assignable-users` | Authenticated | Project members (for task assignment) |
| `POST` | `/api/projects/:id/members` | Admin | Add member `{ userId }` |
| `DELETE` | `/api/projects/:id/members/:userId` | Admin | Remove member |

### Tasks

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/tasks` | Authenticated | List tasks (role-filtered). Query: `?projectId=&status=` |
| `GET` | `/api/tasks/stats` | Authenticated | Dashboard stats (role-filtered) |
| `GET` | `/api/tasks/:id` | Authenticated | Single task |
| `POST` | `/api/tasks` | Admin | Create task |
| `PUT` | `/api/tasks/:id` | Authenticated | Full edit (Admin) / status only (Member) |
| `DELETE` | `/api/tasks/:id` | Admin | Delete task |

### Utility

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/health` | Public | Server health + timestamp |
| `POST` | `/api/dev/seed` | Dev only | Populate test data |

---

## 🔐 Role & Permission Model

| Action | Admin | Member |
|--------|:-----:|:------:|
| Sign up / log in | ✅ | ✅ |
| View own profile | ✅ | ✅ |
| List all users | ✅ | ❌ |
| Create / edit / delete projects | ✅ | ❌ |
| Add / remove project members | ✅ | ❌ |
| View all projects | ✅ | ❌ |
| View joined projects | ✅ | ✅ |
| Create / delete tasks | ✅ | ❌ |
| View all tasks | ✅ | ❌ |
| View own assigned tasks | ✅ | ✅ |
| Update any task (all fields) | ✅ | ❌ |
| Update own task status | ✅ | ✅ |

> The first account to register is automatically granted Admin. All subsequent accounts are Members.

---

## 📁 Project Structure

```
team-task-manager/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # sql.js init, schema creation, persistence
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verify → attaches req.user
│   │   │   └── roleCheck.js          # requireAdmin guard
│   │   ├── routes/
│   │   │   ├── auth.js               # POST /signup, /login
│   │   │   ├── users.js              # GET /users, /users/me
│   │   │   ├── projects.js           # CRUD + member management
│   │   │   ├── tasks.js              # CRUD + stats
│   │   │   └── dev.js                # Seed endpoint (dev only)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── projectController.js
│   │   │   └── taskController.js
│   │   └── app.js                    # Express setup: CORS, Helmet, rate-limit, routes
│   │
│   ├── server.js                     # Entrypoint: env validation, DB init, listen
│   ├── package.json
│   ├── .env                          # Local secrets (gitignored)
│   └── .env.example                  # Template
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js              # Axios instance + request/response interceptors
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global auth state, login/logout helpers
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation with user pill + logout
│   │   │   ├── PrivateRoute.jsx      # Redirect-to-login wrapper
│   │   │   ├── TaskCard.jsx          # Task row with inline status update
│   │   │   └── StatusBadge.jsx       # Colour-coded status pill
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx         # Stats + filtered task list
│   │   │   ├── Projects.jsx          # Project grid with create/edit modal
│   │   │   ├── ProjectDetail.jsx     # Members + tasks + task/member modals
│   │   │   └── Tasks.jsx             # Full task list with create modal
│   │   ├── App.jsx                   # Route definitions
│   │   ├── main.jsx                  # React root mount
│   │   └── index.css                 # Full design system (dark glassmorphism)
│   │
│   ├── index.html
│   ├── vite.config.js                # Dev proxy: /api → :5000
│   ├── package.json
│   ├── .env
│   └── .env.example
│
└── README.md
```

---

## 💻 Local Setup

### Prerequisites

- **Node.js v18+** → [nodejs.org](https://nodejs.org)
- npm (comes with Node)

Verify:
```bash
node --version   # must be v18 or higher
npm --version
```

### 1. Clone / extract the project

```bash
# If using git
git clone <repo-url> team-task-manager
cd team-task-manager

# Or just extract the zip and cd into the folder
```

### 2. Backend

```bash
cd backend
npm install

# Copy the example env file
cp .env.example .env
# The defaults work for local development — no changes needed

npm run dev
# → API running at http://localhost:5000
# → ✅ Database ready at: ./data/taskmanager.db
```

### 3. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
# → UI running at http://localhost:5173
```

### 4. Seed test data

```bash
curl -X POST http://localhost:5000/api/dev/seed
```

This creates 4 users, 2 projects, and 5 tasks so you can explore without manual setup.

### 5. Open the app

Visit **http://localhost:5173** and log in with:
- **Admin:** `admin@test.com` / `admin123`
- **Member:** `john@test.com` / `john123`

### Verification checklist

```
✅ Sign up → first account becomes Admin
✅ Log in → redirected to Dashboard with stats
✅ Admin: create a project → see it in Projects grid
✅ Admin: add members to the project
✅ Admin: create a task → assignee dropdown shows project members only
✅ Member: log in → see only assigned tasks
✅ Member: update task status → dropdown reflects change
✅ Member: try to access /api/projects (POST) → 403 Forbidden
✅ Log out → redirected to login, token cleared
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

```bash
# Environment
NODE_ENV=development          # 'production' enables production CORS & hides error details

# Server
PORT=5000

# JWT
JWT_SECRET=dev_jwt_secret_team_task_manager_2024   # CHANGE THIS in production
JWT_EXPIRES_IN=7d

# Database
DB_PATH=./data/taskmanager.db  # Path where SQLite file is saved

# CORS — comma-separated frontend origins
CLIENT_URL=http://localhost:5173
# Production example: CLIENT_URL=https://my-app.vercel.app
```

### Frontend (`frontend/.env`)

```bash
# Leave blank in development — Vite dev proxy handles /api → localhost:5000
VITE_API_URL=

# Production: set to your deployed backend URL (no trailing slash)
# VITE_API_URL=https://my-backend.up.railway.app
```

---

## 🚀 Production Deployment

### Generate a strong JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Backend → Railway / Render / any Node host

1. Push `backend/` to GitHub (`.env` is gitignored ✅)
2. Create a new service and point it at the repo
3. Set environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=<generated above>
   JWT_EXPIRES_IN=7d
   DB_PATH=./data/taskmanager.db
   CLIENT_URL=https://your-frontend.vercel.app
   ```
4. Start command: `npm start` (runs `NODE_ENV=production node server.js`)

> ⚠️ **SQLite persistence warning**: On Railway and Render, the filesystem is ephemeral — it is wiped on every redeploy. For persistent data you must either attach a persistent volume (Railway → Storage) and point `DB_PATH` to it, or migrate to a managed database (PostgreSQL via `pg`).

### Frontend → Vercel / Netlify

1. Push `frontend/` to GitHub
2. Create a new project in Vercel, root: `frontend/`
3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   ```
4. Deploy — Vercel auto-runs `npm run build`

---

## 🔒 Security

| Layer | Implementation |
|-------|---------------|
| Password storage | bcrypt (cost factor 12) |
| Auth token | JWT signed with `JWT_SECRET`, 7-day TTL |
| Token transport | `Authorization: Bearer <token>` header (not cookies) |
| Auth brute-force | Rate limit: 20 requests / IP / 15 min |
| HTTP headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Dev: all origins. Production: whitelist via `CLIENT_URL` |
| Input validation | express-validator on all write endpoints |
| Role enforcement | Middleware layer (`requireAdmin`) + controller layer |
| Token freshness | Every request re-fetches user from DB — role changes take effect immediately |
| Seed endpoint | Only mounted when `NODE_ENV !== 'production'` |
| Error leakage | In production, 500 errors return generic message; details stay in server logs |

---


---

<div align="center">

Built for the **Ethara.AI** engineering assessment · May 2026

</div>