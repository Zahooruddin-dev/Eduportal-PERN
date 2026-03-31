# Mizuka Portal Backend

Version: 7.2.0

This package contains the Express + PostgreSQL API for Mizuka Portal. It serves authentication, class management, enrollments, reports, communication, admin tools, and supporting features.

## Stack

- Node.js + Express
- PostgreSQL (Neon compatible)
- JWT authentication
- bcrypt
- Socket.IO
- Multer + Cloudinary upload flow

## Folder Guide

- `controllers`: request handlers grouped by domain
- `routes`: API route registration and middleware wiring
- `db`: SQL query modules and schema bootstrap helper
- `middleware`: auth, upload, and UUID validators
- `socket`: socket event handlers for chat/communication
- `sql`: SQL scripts and migrations

## API Groups

- `/api/auth`: login, register, profile, password reset
- `/api/class`: class management and class-scoped resources
- `/api/enroll`: enroll/unenroll and class membership status
- `/api/announcements`: announcements and class feeds
- `/api/gradebook`: grading flows
- `/api/reports`: report and complaint workflows
- `/api/admin`: institute admin actions
- `/api/communication`: inbox, contacts, messages

## Environment Variables

Create `backend/.env`:

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

## Scripts

- `npm run start`: run server with Node
- `npm run server`: run server with nodemon

## Local Run

```bash
cd backend
npm install
npm run server
```

Default local URL: `http://localhost:3000`

If port 3000 is in use:

```powershell
$env:PORT='3001'; npm run server
```

## Validation and Security Notes

- JWT token is validated and then matched against current user state in database.
- UUID route parameters are validated through middleware.
- Institute boundary checks are applied in sensitive flows.
- Report and list endpoints enforce bounded pagination in current architecture.
