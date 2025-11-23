# Offline Auth + Ticket Scope

## Goals

- Keep authentication usable without immediate network access.
- Cache every ticket a signed-in user views so dashboards/tables still render offline.
- Allow ticket mutations (create/update/assign/approve/reject) to be queued and replayed safely.

## Auth Requirements

1. **Cached credentials & payload history**
   - Store last successful login + signup payloads (email, hashed password reference, role) encrypted via SecureStore.
   - When offline, allow user to re-authenticate using cached payload + stored tokens, showing clear “offline mode” notice.
2. **Biometric/passcode unlock**
   - Integrate Expo LocalAuthentication to gate re-entry: if cached session exists, prompt for biometric/PIN before restoring session.
   - Provide fallback to manual password if biometrics unavailable.
3. **Offline banner + state**
   - Global network listener (NetInfo) updates a shared `offlineStatus` store.
   - Surface banner on auth + ticket screens indicating offline operation and queued actions count.
4. **Background token refresh**
   - When network returns, automatically refresh tokens (using stored refresh token) via background task.
   - If refresh fails, mark session stale but keep offline access until the user chooses to sign out or retry.
5. **Queued signup/login attempts**
   - If a new signup/login is initiated offline, store payload + intent, optimistically create local session (limited access) and replay request when online.
   - Reconcile server response (confirm account, update user id) once synced.

## Ticket Caching Requirements

1. **Per-user cache**
   - Use (or SQLite layer) to store every ticket retrieved from API, indexed by ticket id and lastFetchedAt.
   - Include related metadata: status, priority, assignee, assignment requests, escalation flags.
2. **Hydrate from cache-first**
   - Screens load data from cache immediately, then overlay updates when online fetch completes.
   - Dashboard/report views reference cached aggregates derived from stored tickets to avoid blank states.

## Offline Ticket Actions

1. **Action queue**
   - Extend existing offline queue to support action types:
     - `ticket.create`
     - `ticket.update`
     - `ticket.assign`
     - `ticket.reassign`
     - `ticket.approve`
     - `ticket.reject`
   - Persist queue items with payload, optimistic patch, retry metadata, conflict policy.
2. **Optimistic updates**
   - Apply local mutations immediately; mark tickets with `pendingSync = true` so UI can show badges.
3. **Conflict handling**
   - On sync, if server version differs, fetch latest ticket and replay transformation or flag manual resolution.
4. **Admin approvals/rejections**
   - Admin actions follow same queue structure with elevated role requirement; enforce that only cached sessions with admin role can queue these actions offline.

## UX / Messaging

- Offline banner references queue length (“Offline mode • 3 actions pending”).
- Ticket cards show `Pending sync` note when changes haven’t been flushed.
- Auth screens show `Signed in offline – limited network features` when session restored without connectivity.

## Testing Checklist

- Toggle airplane mode during login, signup, ticket create/update/assign/approval.
- Verify biometric unlock flow while offline.
- Ensure queued actions replay automatically when network returns.
- Validate background token refresh occurs without opening the app (using Expo Task Manager / background fetch).
- New cache & session loop:
   1. Sign in while online; open dashboard, ticket list, ticket detail, and admin reports so cache warms.
   2. Toggle airplane mode and force-quit/relaunch the app – biometric prompt should restore cached session without hitting API.
   3. Navigate through the same screens offline and confirm cached data renders immediately (no loaders/crashes).
   4. Come back online and verify fresh data replaces cached results automatically (React Query refetch should succeed).
   5. From settings, optionally call the new `signOut({ forgetOfflineSnapshot: true })` path and confirm offline resume is no longer offered.
