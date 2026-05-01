# 🗂️ Team Task Manager

A full-stack collaborative task management web application built with **React**, **Node.js/Express**, and **PostgreSQL**, deployed on **Railway**.

🔗 **Live Demo:** [https://task-manager-production-0e09.up.railway.app](https://task-manager-production-0e09.up.railway.app/login)

---

## 📌 Overview

Team Task Manager is a role-based project and task tracking application designed for teams. It supports two user roles — **Admin** and **Member** — with fine-grained access control across projects and tasks. Admins manage the full system, while members interact only with tasks assigned to them.

---

## ✨ Features

### Authentication & Authorization
- JWT-based authentication with secure password hashing (bcrypt)
- Role-based access control: **Admin** and **Member**
- The first user to register is automatically assigned the Admin role
- Rate-limited auth endpoints (20 requests per 15 minutes) to prevent brute-force attacks

### Dashboard
- Task statistics summary: Total, Completed, Pending, In Progress, Overdue
- Filterable task list (All / Pending / In Progress / Completed / Overdue)
- Role-aware: Admins see all tasks; Members see only their assigned tasks

### Projects
- Admins can create, update, and delete projects
- Admins can add/remove members from projects
- Members can view only the projects they belong to
- Project detail page shows all tasks and members within the project

### Tasks
- Admins can create, fully edit, and delete tasks
- Tasks can be assigned to project members with optional due dates
- Members can update only the status of their own assigned tasks (`pending → in_progress → completed`)
- Task status badges for visual clarity

### Security
- `helmet` middleware for secure HTTP headers
- CORS configured for production (same-origin) and development
- Input validation via `express-validator` on all write endpoints
- JWT tokens expire after 7 days

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios, Vite |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (production), SQLite (development) |
| Auth | JSON Web Tokens (JWT), bcryptjs |
| Deployment | Railway (full-stack monorepo) |
| Security | Helmet, express-rate-limit, express-validator, CORS |

---

## 📁 Project Structure

```
team-task-manager/
├── frontend/                  # React + Vite frontend
│   └── src/
│       ├── api/               # Axios instance with base URL & auth headers
│       ├── components/        # Navbar, TaskCard, StatusBadge, PrivateRoute
│       ├── context/           # AuthContext (global auth state)
│       └── pages/             # Login, Signup, Dashboard, Projects, ProjectDetail, Tasks
│
├── backend/                   # Express REST API
│   └── src/
│       ├── config/            # Database connection (PostgreSQL / SQLite)
│       ├── controllers/       # authController, projectController, taskController, userController
│       ├── middleware/         # JWT authentication, role-based access (requireAdmin)
│       └── routes/            # /api/auth, /api/projects, /api/tasks, /api/users
│
└── railway.json               # Railway build & deploy configuration
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Projects
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/projects` | All | List accessible projects |
| GET | `/api/projects/:id` | All | Get project details with tasks & members |
| POST | `/api/projects` | Admin | Create a new project |
| PUT | `/api/projects/:id` | Admin | Update project details |
| DELETE | `/api/projects/:id` | Admin | Delete project (cascades to tasks) |
| POST | `/api/projects/:id/members` | Admin | Add a member to a project |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove a member from a project |

### Tasks
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/tasks` | All | List tasks (role-filtered) |
| GET | `/api/tasks/stats` | All | Get task statistics for dashboard |
| GET | `/api/tasks/:id` | All | Get a single task |
| POST | `/api/tasks` | Admin | Create a new task |
| PUT | `/api/tasks/:id` | All | Full edit (Admin) / Status only (Member) |
| DELETE | `/api/tasks/:id` | Admin | Delete a task |

---

## 🚀 Running Locally

### Prerequisites
- Node.js >= 18
- PostgreSQL (or SQLite for quick local dev)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd team-task-manager
```

### 2. Setup the backend
```bash
cd backend
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, etc.
npm install
npm run dev
```

### 3. Setup the frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

### 4. Open the app
Visit `http://localhost:5173` in your browser. The first user you register becomes the Admin.

---

## 🌐 Deployment

The app is deployed as a monorepo on **Railway**. The build process:
1. Installs frontend dependencies and builds the React app with Vite
2. Installs backend dependencies
3. Express serves the compiled React `dist/` as static files in production
4. All non-API routes fall through to `index.html` for React Router support

**Build command:**
```bash
cd frontend && npm install && npm run build && cd ../backend && npm install
```

**Start command:**
```bash
cd backend && node server.js
```

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry duration (default: `7d`) |
| `PORT` | Server port (Railway injects this automatically) |
| `NODE_ENV` | Set to `production` on Railway |
| `CLIENT_URL` | Allowed CORS origin(s), comma-separated |

---

## 👤 Author

Built as part of a campus placement project submission.