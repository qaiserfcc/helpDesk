import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

const DB_NAME = "helpdesk-offline.db";
const MAX_CACHE_ENTRIES_PER_USER = 120;

export type TicketRow = {
  id: string;
  action: string;
  method: "POST" | "PATCH";
  endpoint: string;
  ticketId: string | null;
  payload: string; // JSON blob for offline-first sync
  optimistic: string | null;
  status: "queued" | "synced" | "failed";
  attempts: number;
  updatedAt: number;
};

export type QueueActionPayload = {
  action: string;
  method: "POST" | "PATCH";
  endpoint: string;
  payload: Record<string, unknown>;
  ticketId?: string | null;
  optimistic?: Record<string, unknown> | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.runAsync("PRAGMA journal_mode = WAL;");
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          action TEXT NOT NULL DEFAULT 'ticket.create',
          method TEXT NOT NULL DEFAULT 'POST',
          endpoint TEXT NOT NULL DEFAULT '/tickets/sync',
          ticketId TEXT,
          optimistic TEXT,
          status TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          updatedAt INTEGER NOT NULL
        );
      `);
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS ticket_cache (
          cacheKey TEXT PRIMARY KEY NOT NULL,
          ownerId TEXT NOT NULL,
          scope TEXT NOT NULL,
          payload TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );
      `);
      await db.runAsync(
        "CREATE INDEX IF NOT EXISTS idx_ticket_cache_owner ON ticket_cache(ownerId, updatedAt);",
      );
      await ensureTicketColumns(db);
      return db;
    })();
  }
  return dbPromise;
}

async function ensureTicketColumns(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(tickets);",
  );
  const existing = new Set(columns.map((column) => column.name));
  const migrations: string[] = [];
  if (!existing.has("action")) {
    migrations.push(
      "ALTER TABLE tickets ADD COLUMN action TEXT NOT NULL DEFAULT 'ticket.create'",
    );
  }
  if (!existing.has("method")) {
    migrations.push(
      "ALTER TABLE tickets ADD COLUMN method TEXT NOT NULL DEFAULT 'POST'",
    );
  }
  if (!existing.has("endpoint")) {
    migrations.push(
      "ALTER TABLE tickets ADD COLUMN endpoint TEXT NOT NULL DEFAULT '/tickets/sync'",
    );
  }
  if (!existing.has("ticketId")) {
    migrations.push("ALTER TABLE tickets ADD COLUMN ticketId TEXT");
  }
  if (!existing.has("optimistic")) {
    migrations.push("ALTER TABLE tickets ADD COLUMN optimistic TEXT");
  }
  if (!existing.has("attempts")) {
    migrations.push(
      "ALTER TABLE tickets ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0",
    );
  }
  for (const statement of migrations) {
    await db.runAsync(statement);
  }
}

export async function queueTicket(payload: Record<string, unknown>) {
  return queueTicketAction({
    action: "ticket.create",
    method: "POST",
    endpoint: "/tickets/sync",
    payload,
  });
}

export async function queueTicketAction({
  action,
  method,
  endpoint,
  payload,
  ticketId,
  optimistic,
}: QueueActionPayload) {
  const db = await openDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO tickets (id, action, method, endpoint, ticketId, payload, optimistic, status, attempts, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      action,
      method,
      endpoint,
      ticketId ?? null,
      JSON.stringify(payload),
      optimistic ? JSON.stringify(optimistic) : null,
      "queued",
      now,
    ],
  );
  return id;
}

export async function listQueuedTickets(): Promise<TicketRow[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<TicketRow>(
    "SELECT * FROM tickets WHERE status != ? ORDER BY updatedAt ASC",
    ["synced"],
  );
  return rows;
}

export async function markTicketSynced(id: string) {
  const db = await openDatabase();
  await db.runAsync(
    "UPDATE tickets SET status = ?, attempts = 0, updatedAt = ? WHERE id = ?",
    ["synced", Date.now(), id],
  );
}

export async function markTicketFailed(id: string) {
  const db = await openDatabase();
  await db.runAsync(
    "UPDATE tickets SET status = ?, attempts = attempts + 1, updatedAt = ? WHERE id = ?",
    ["failed", Date.now(), id],
  );
}

type CacheKeyOptions = {
  ownerId: string;
  scope: string;
};

function buildCacheKey({ ownerId, scope }: CacheKeyOptions) {
  return `${ownerId}::${scope}`;
}

export async function writeTicketCache(
  options: CacheKeyOptions,
  payload: unknown,
) {
  const db = await openDatabase();
  const cacheKey = buildCacheKey(options);
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO ticket_cache (cacheKey, ownerId, scope, payload, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(cacheKey) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt`,
    [cacheKey, options.ownerId, options.scope, JSON.stringify(payload), now],
  );
  await pruneTicketCache(options.ownerId);
}

export async function readTicketCache<T>(options: CacheKeyOptions) {
  const db = await openDatabase();
  const cacheKey = buildCacheKey(options);
  const rows = await db.getAllAsync<{ payload: string }>(
    "SELECT payload FROM ticket_cache WHERE cacheKey = ?",
    [cacheKey],
  );
  const row = rows[0];
  if (!row?.payload) {
    return null;
  }
  try {
    return JSON.parse(row.payload) as T;
  } catch (error) {
    console.warn("Failed to parse ticket cache entry", cacheKey, error);
    return null;
  }
}

export async function listTicketCacheScopes(
  ownerId: string,
  scopePrefix?: string,
) {
  const db = await openDatabase();
  const params: Array<string> = [ownerId];
  let query = "SELECT scope FROM ticket_cache WHERE ownerId = ?";
  if (scopePrefix) {
    query += " AND scope LIKE ?";
    params.push(`${scopePrefix}%`);
  }
  const rows = await db.getAllAsync<{ scope: string }>(query, params);
  return rows.map((row) => row.scope);
}

async function pruneTicketCache(ownerId: string) {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ cacheKey: string }>(
    `SELECT cacheKey
     FROM ticket_cache
     WHERE ownerId = ?
     ORDER BY updatedAt DESC
     LIMIT -1 OFFSET ?`,
    [ownerId, MAX_CACHE_ENTRIES_PER_USER],
  );
  if (!rows.length) {
    return;
  }
  const keys = rows.map((row) => row.cacheKey);
  const placeholders = keys.map(() => "?").join(",");
  await db.runAsync(
    `DELETE FROM ticket_cache WHERE cacheKey IN (${placeholders})`,
    keys,
  );
}
