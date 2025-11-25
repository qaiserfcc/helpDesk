# Deployment Overview

The Render blueprint (`render.yaml`) now provisions **only** the backend so it stays within the free-tier service limit. Deploy the React web client separately on Vercel.

## Backend on Render

1. Install the Render CLI (see links below) and run `render blueprint launch` from the repo root.
2. When prompted, supply required secrets: `DATABASE_URL`, `SHADOW_DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RESEND_API_KEY`, and `ALLOWED_ORIGINS` (include your Vercel URL).
3. Render runs the Prisma migrations and seeds the admin user using the commands baked into `render.yaml`.

## Frontend on Vercel

1. Import the repo into Vercel and set the project root to `apps/web`.
2. Configure environment variables:
	- `VITE_API_BASE_URL` → the Render backend URL (e.g. `https://helpdesk-backend.onrender.com`).
3. Use the default build command `npm run build` and output directory `dist`.
4. After deploying, add the Vercel domain to the backend `ALLOWED_ORIGINS` secret so CORS and Socket.IO accept the requests.

## Render CLI

- [Homebrew](https://render.com/docs/cli#homebrew-macos-linux)
- [Direct Download](https://render.com/docs/cli#direct-download)

Documentation: <https://render.com/docs/cli>
