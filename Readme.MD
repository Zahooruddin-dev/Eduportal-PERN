# Mizuka Portal

Mizuka Portal is a full-stack institute management platform built with the PERN stack (PostgreSQL, Express, React, Node.js).

This repository contains:

- Backend package: Mizuka Portal Backend (version 7.2.0)
- Frontend package: Mizuka Portal (version 4.4.0)

## Repository Structure

```text
Institute-dashboard-PERN/
|- backend/
|  |- controllers/
|  |- db/
|  |- middleware/
|  |- routes/
|  |- socket/
|  |- app.js
|  |- package.json
|- frontend/
|  |- src/
|  |- index.html
|  |- package.json
|- Readme.MD
```

## Product Areas

- Role-based dashboards for student, teacher, and admin
- Class and enrollment workflows
- Announcements, assignments, attendance, and gradebook
- Institute-level reports and complaints
- Real-time student-teacher communication
- Theme-aware UI with responsive dashboard navigation

## Package Documentation

- Backend docs: `backend/README.md`
- Frontend docs: `frontend/README.md`

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment files

Backend: create `backend/.env`

```env
DATABASE_URL=postgres_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
FRONTEND_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ADMIN_BOOTSTRAP_SECRET=your_setup_secret
```

Frontend: create `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:3000
```

### 3. Run locally

Backend terminal:

```bash
cd backend
npm run server
```

Frontend terminal:

```bash
cd frontend
npm run dev
```

## Ports

- Backend default: `http://localhost:3000`
- Frontend default: `http://localhost:5173`

If backend port is busy on Windows PowerShell:

```powershell
$env:PORT='3001'; npm run server
```

## Build and Lint

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
npm run server
```

## Notes

- The frontend uses route-driven tabs through `/dashboard/:tab?`.
- Global theme and API error handling are configured in the frontend app shell.
- Communication endpoints are treated as real-time paths and bypass API caching.
