# Team Task Manager

A full-stack project management app with role-based access control.

**Stack:** Node.js + Express + SQLite (backend) · React + Vite (frontend)  
**Status:** ✅ Production Ready | **Version:** 1.0.0

---

## 📋 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get running in 2 minutes
- **[PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md)** - Full deployment instructions
- **[BUG_FIXES.md](BUG_FIXES.md)** - All fixes and production checklist

---

## Prerequisites

- **Node.js v18+** — [Download here](https://nodejs.org/en/download)
- **Git** (optional)

---

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org (choose LTS for Windows)  
Verify installation:
```bash
node --version   # v18+ required
npm --version
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev      # API on http://localhost:5000
```

### 3. Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev      # UI on http://localhost:5173
```

### 4. Open App
Visit **http://localhost:5173**

### 5. Create Test Data
```bash
curl -X POST http://localhost:5000/api/dev/seed
```

Test credentials:
- Admin: `admin@test.com` / `admin123`
- Member: `john@test.com` / `john123`

---

## ✨ Features

✅ User authentication (JWT)  
✅ Role-based access control (Admin, Member)  
✅ Project management with member assignment  
✅ Task creation and assignment  
✅ Task status tracking (Pending, In Progress, Completed)  
✅ Dashboard with statistics  
✅ Rate limiting on auth endpoints  
✅ Security headers (Helmet)  
✅ Input validation  
✅ SQLite persistence  

---

## 🚀 Quick Test

```bash
# 1. Create test data
curl -X POST http://localhost:5000/api/dev/seed

# 2. Login as admin
# Email: admin@test.com
# Password: admin123

# 3. Create a project
# 4. Add project members
# 5. Create a task and assign to a member
# 6. Observe: dropdown shows all project members (not just admin!)
```

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/health` | Server health check |
| GET | `/api/users` | All users (admin only) |
| GET | `/api/projects` | List projects (role-filtered) |
| GET | `/api/projects/:id/assignable-users` | **NEW** Project members |
| POST | `/api/tasks` | Create task (admin only) |
| PUT | `/api/tasks/:id` | Update task |

See [PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md) for full API reference.

---

## Role Permissions

| Feature | Admin | Member |
|---------|-------|--------|
| Create projects | ✅ | ❌ |
| Manage project members | ✅ | ❌ |
| Create tasks | ✅ | ❌ |
| Assign tasks | ✅ | ❌ |
| View own tasks | ✅ | ✅ |
| Update own task status | ✅ | ✅ |
| View all tasks | ✅ | ❌ |

---

## Environment Variables

### Backend (`backend/.env`)
```bash
NODE_ENV=development
PORT=5000
JWT_SECRET=dev_jwt_secret_team_task_manager_2024
DB_PATH=./data/taskmanager.db
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```bash
# Leave blank to use Vite dev proxy
VITE_API_URL=
```

---

## 🔒 Security

- JWT authentication
- Bcrypt password hashing
- Role-based access control
- Rate limiting (20 auth attempts / 15 min)
- Helmet security headers
- CORS protection
- Input validation

---

## 📱 Architecture

**Backend**: Express.js + SQLite  
**Frontend**: React 18 + Vite + React Router  
**Auth**: JWT (7-day expiration)  
**Database**: SQLite (persisted to disk)  

---

## 🐛 What's Fixed

✅ **User dropdown shows all project members** (was showing only admin)  
✅ **CORS errors resolved**  
✅ **Better error handling and logging**  
✅ **Member validation improved**  
✅ **Test data endpoint added**  

See [BUG_FIXES.md](BUG_FIXES.md) for complete list.

---

## 🚀 Production Deployment

See [PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md) for:
- Environment setup
- Security checklist
- Database backup strategy
- Process management (PM2)
- HTTPS/TLS configuration
- Monitoring & logging

**Quick summary:**
1. Generate strong JWT secret: `openssl rand -base64 32`
2. Update `.env` with production values
3. Run: `NODE_ENV=production npm start`
4. Use PM2 for auto-restart and monitoring

---

## 📞 Support

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "Only admin in dropdown" | Add project members first via "Members" button |
| "Port 5000 already in use" | Change PORT in .env or kill process |
| "CORS origin not allowed" | Verify CLIENT_URL in .env |
| "Database not found" | Run: `mkdir -p backend/data` |

See [BUG_FIXES.md](BUG_FIXES.md) for troubleshooting.

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── projects.js
│   │   │   ├── tasks.js
│   │   │   └── dev.js (TEST DATA)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── app.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── App.jsx
│   └── vite.config.js
│
├── QUICK_START.md
├── PRODUCTION_GUIDE.md
├── BUG_FIXES.md
└── README.md
```

---

**Last Updated**: 2026-05-01  
**Status**: Production Ready ✅  
**Version**: 1.0.0
