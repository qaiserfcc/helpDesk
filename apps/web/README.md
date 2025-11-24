# HelpDesk: Web Client

This app is a React + Vite TypeScript web client for the HelpDesk backend. It implements core features present in the mobile application, including login, ticket list, ticket details, ticket creation, and basic admin pages.

## Dev

From repo root:
```bash
cd apps/web
VITE_API_BASE_URL=https://helpdesk-backend.fly.dev npm install
VITE_API_BASE_URL=https://helpdesk-backend.fly.dev npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Notes
- The app uses the `/api` endpoints on the backend. Ensure the backend is running and accessible via `VITE_API_BASE_URL`.
- Auth tokens are stored in `localStorage` and used to set the `Authorization` header for subsequent requests. The realtime socket is initialized on login.
- Placeholder pages are included for Reports, Users, and Dashboard to match mobile app screens. These can be extended as needed.
