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

## Render MCP Server

Use Render's hosted MCP server to manage infrastructure from compatible AI tools (Cursor, Claude Code, etc.). The server URL is `https://mcp.render.com/mcp`.

1. **Create an API key**: Visit <https://dashboard.render.com/settings#api-keys> and generate a key. Treat it like any production secret—it grants access to every workspace you can access. The MCP server only performs read operations plus env-var updates, but protecting the key is still critical.
2. **Configure your MCP host**: Add the server definition to your tool's MCP config. Example for Cursor (`~/.cursor/mcp.json`):

```json
{
	"mcpServers": {
		"render": {
			"url": "https://mcp.render.com/mcp",
			"headers": {
				"Authorization": "Bearer <YOUR_API_KEY>"
			}
		}
	}
}
```

3. **Select the workspace**: Prompt your tool with `Set my Render workspace to <workspace-name>` so future MCP calls target the correct environment.

Once configured, you can issue prompts like "List my Render services" or "Update the env vars for helpdesk-backend" and the MCP server will call the Render API on your behalf. For advanced capabilities or self-hosting instructions, see <https://render.com/docs/mcp-server>.
