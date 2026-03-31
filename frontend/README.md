# Mizuka Portal Frontend

Version: 4.4.0

This package contains the React client for Mizuka Portal. It provides role-based dashboards, real-time communication, reporting workflows, and institute administration screens.

## Stack

- React 19 + Vite
- React Router
- Axios
- Tailwind CSS (utility classes) with CSS custom properties for theming
- Socket.IO client for communication updates

## Key Frontend Architecture

- Route-driven dashboard tabs: `/dashboard/:tab?`
- Global auth state: `src/context/AuthContext.jsx`
- Global theme provider: `src/hooks/useTheme.js`
- Global UI error protection: `src/components/ErrorBoundary.jsx`
- Global API error notifications and session handling: `src/api/axiosConfig.js`
- Simple GET caching in API layer with automatic invalidation on write requests

## Folder Guide

- `src/Auth`: authentication screens
- `src/components/Dashboard`: role-based dashboard shell
- `src/components/Sidebar/Tabs`: all role tabs and shared modules
- `src/api`: API clients
- `src/context`: app-wide providers
- `src/hooks`: reusable hooks
- `src/utils`: route guards and helpers

## Environment Variables

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

## Scripts

- `npm run dev`: run local development server
- `npm run build`: create production build
- `npm run preview`: preview built output
- `npm run lint`: run ESLint checks

## Local Run

```bash
cd frontend
npm install
npm run dev
```

Default local URL: `http://localhost:5173`

## Notes

- Theme tokens are defined in `src/index.css` and applied globally through the theme provider.
- Communication-related API calls intentionally bypass cache to keep inbox and unread counters fresh.
