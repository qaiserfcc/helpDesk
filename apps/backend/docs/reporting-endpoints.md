# Reporting & Export Endpoints

This document captures the backend routes that power the new admin, agent, and end-user reporting experiences. Each section lists the HTTP method, authentication requirements, expected request parameters, and response payload shape so the mobile/web clients can stay in sync.

> All endpoints below live under the `/reports` prefix and require a valid JWT session cookie/header issued by the HelpDesk API.

## Quick reference

| Route | Method | Roles | Description |
| --- | --- | --- | --- |
| `/reports/users/me/tickets` | GET | User | Personal ticket history + status counts |
| `/reports/agents/me/workload` | GET | Agent | Assigned queue, pending transfers, escalations |
| `/reports/admin/overview` | GET | Admin | Org-wide status distribution, agent load, aging tickets |
| `/reports/admin/escalations` | GET | Admin | Unresolved high-priority & stale tickets |
| `/reports/admin/productivity?days=7` | GET | Admin | Resolved ticket trend for the requested window |
| `/reports/tickets/export?format=json` | GET | User/Agent/Admin | Role-aware export feed with optional CSV download |

---

## `/reports/users/me/tickets`

- **Method:** `GET`
- **Roles:** `user` only
- **Purpose:** surfaces up to 200 of the requester’s most recent tickets along with live status counts.
- **Query params:** _none_
- **Response:**

```json
{
  "report": {
    "statusCounts": {
      "open": 3,
      "in_progress": 1,
      "resolved": 9
    },
    "tickets": [
      {
        "id": "tick_123",
        "description": "Forgot my VPN password",
        "status": "open",
        "priority": "medium",
        "issueType": "access",
        "createdAt": "2025-11-20T10:12:00.000Z",
        "resolvedAt": null,
        "creator": { "id": "usr_1", "name": "Ada", "email": "ada@example.com" },
        "assignee": { "id": "agent_7", "name": "Chris", "email": "chris@example.com" }
      }
    ]
  }
}
```

---

## `/reports/agents/me/workload`

- **Method:** `GET`
- **Roles:** `agent` only
- **Purpose:** gives the currently signed-in agent a snapshot of their assigned queue, pending assignment requests, and any escalations (high priority or >72h open).
- **Query params:** _none_
- **Response:**

```json
{
  "report": {
    "statusCounts": { "open": 4, "in_progress": 5, "resolved": 12 },
    "assigned": [/* up to 100 current tickets */],
    "pendingRequests": [/* tickets the agent requested */],
    "escalations": [/* subset of assigned[] needing attention */]
  }
}
```

---

## `/reports/admin/overview`

- **Method:** `GET`
- **Roles:** `admin`
- **Purpose:** primary dashboard feed combining status buckets, agent assignment load, and the 20 oldest unresolved tickets.
- **Query params:** _none_
- **Response:**

```json
{
  "report": {
    "statusCounts": { "open": 18, "in_progress": 7, "resolved": 120 },
    "assignmentLoad": [
      {
        "agentId": "agent_7",
        "count": 6,
        "agent": { "id": "agent_7", "name": "Chris", "email": "chris@example.com" }
      }
    ],
    "oldestOpen": [/* oldest 20 unresolved tickets */]
  }
}
```

---

## `/reports/admin/escalations`

- **Method:** `GET`
- **Roles:** `admin`
- **Purpose:** quickly surfaces high-priority unresolved issues plus tickets older than 72 hours that are still open/in-progress.
- **Query params:** _none_
- **Response:**

```json
{
  "report": {
    "highPriority": [/* unresolved high-priority tickets */],
    "staleTickets": [/* unresolved tickets older than 72h */]
  }
}
```

---

## `/reports/admin/productivity`

- **Method:** `GET`
- **Roles:** `admin`
- **Purpose:** trend line of resolved tickets over a 1–30 day window (defaults to 7).
- **Query params:**
  - `days` – optional integer between 1 and 30 (default `7`).
- **Response:**

```json
{
  "report": {
    "resolutionTrend": [
      { "date": "2025-11-17", "count": 12 },
      { "date": "2025-11-18", "count": 8 }
    ]
  }
}
```

---

## `/reports/tickets/export`

- **Method:** `GET`
- **Roles:**
  - `user`: downloads their own tickets.
  - `agent`: downloads tickets assigned to them.
  - `admin`: can export any scope.
- **Purpose:** produce up to 1,000 tickets matching the role-scoped filters in either JSON (default) or CSV.
- **Query params:**
  - `format` – `json` (default) or `csv`.
  - `scope` – `auto`, `user`, `agent`, `admin`. `auto` maps to the requester’s role.
  - `status` – optional ticket status filter.
  - `creatorId` – allowed for admins exporting specific end users.
  - `agentId` – allowed for admins exporting specific agents.
- **Response (JSON example):**

```json
{
  "scope": "agent",
  "tickets": [/* same ticket shape as above */]
}
```

- **CSV example:** response is streamed with `Content-Type: text/csv` and a filename of `tickets-<scope>.csv`.

---

### Error responses

- `401 Unauthorized` – missing or invalid session token.
- `403 Forbidden` – role mismatch (e.g., agent requesting the user report).
- `400 Bad Request` – invalid query parameter (fails Zod validation).

These codes bubble up as JSON bodies via the existing Express error middleware, so existing mobile handlers can surface the error strings in toasts.
