export const env = {
  // If the VITE_API_BASE_URL env var is not set in dev, use a local proxy path `/api` which the Vite
  // dev server can forward to `https://helpdesk-backend.fly.dev` (see `vite.config.ts` server.proxy).
  apiUrl: (import.meta.env.VITE_API_BASE_URL || '/api') as string,
}
