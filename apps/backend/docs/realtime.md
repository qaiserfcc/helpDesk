# Realtime Ticket Updates

The backend now exposes a Socket.IO server (same host/port as the REST API) to push ticket changes to connected clients.

## Connecting

```ts
const socket = io("https://api.example.com", {
  transports: ["websocket"],
  auth: { token: `Bearer ${accessToken}` },
});
```

- Access tokens are the same JWTs issued by `/api/auth/login`.
- Tokens may be provided via `auth.token`, `Authorization` header, or `token` query param.
- Connections inherit the caller's role; permissions match the REST API guards.

## Automatic rooms

When the socket connects it is enrolled into:

- `user:<userId>` — each signed-in user.
- `role:<role>` — admins, agents, or users.
- `tickets:staff` — agents/admins only for global staff broadcasts.

## Ticket-specific rooms

Sockets can opt into ticket-specific rooms to reduce noise:

```ts
socket.emit("tickets:watch", ticketId, (ack) => {
  if (!ack?.ok) console.error(ack?.error);
});

socket.emit("tickets:leave", ticketId);
```

Authorization checks run server-side before joining.

## Server → client events

| Event | Payload | Notes |
| --- | --- | --- |
| `tickets:created` | `{ ticket }` | Fired after any ticket is created (online or via queued ingest). |
| `tickets:updated` | `{ ticket }` | Fired after updates, assignments, attachments, or resolution. |
| `tickets:activity` | `{ ticketId, activity }` | Mirrors the activity log entries created in `ticketService`. |

Payloads match the REST responses (creator/assignee relations included). Use your existing React Query cache invalidation to refresh relevant lists when these fire.
