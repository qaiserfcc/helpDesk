import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'helpdesk-offline.db';

export type TicketRow = {
  id: string;
  payload: string; // JSON blob for offline-first sync
  status: 'queued' | 'synced' | 'failed';
  updatedAt: number;
};

async function openDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  return db;
}

export async function queueTicket(payload: Record<string, unknown>) {
  const db = await openDatabase();
  const id = await Crypto.randomUUIDAsync();
  const now = Date.now();
  await db.runAsync('INSERT INTO tickets (id, payload, status, updatedAt) VALUES (?, ?, ?, ?)', [
    id,
    JSON.stringify(payload),
    'queued',
    now
  ]);
  return id;
}

export async function listQueuedTickets(): Promise<TicketRow[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<TicketRow>('SELECT * FROM tickets WHERE status != ?', ['synced']);
  return rows;
}

export async function markTicketSynced(id: string) {
  const db = await openDatabase();
  await db.runAsync('UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?', ['synced', Date.now(), id]);
}
