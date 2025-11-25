# Deploying HelpDesk Web to Fly

1. Ensure `flyctl` is installed and you're logged into your Fly account:
```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```

2. Create an app if you don't already have one:
```bash
cd apps/web
flyctl apps create helpdesk-web --region iad
```

3. Set the backend URL secret for the frontend (so Vite env reads it at build):
```bash
flyctl secrets set VITE_API_BASE_URL=https://helpdesk-backend.fly.dev
```

4. Deploy using the Dockerfile:
```bash
flyctl deploy --config fly.toml
```

5. After deployment, verify the site:
```bash
curl -I https://helpdesk-web.fly.dev
```

6. If your backend is returning 502, check the backend status and logs with `flyctl logs --app helpdesk-backend`.
