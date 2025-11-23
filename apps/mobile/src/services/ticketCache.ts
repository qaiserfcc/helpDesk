import { useAuthStore } from "@/store/useAuthStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import {
  listTicketCacheScopes,
  readTicketCache,
  writeTicketCache,
} from "@/storage/offline-db";

export type TicketCacheDeps = {
  getOwnerId: () => string | null;
  isOffline: () => boolean;
  read: typeof readTicketCache;
  write: typeof writeTicketCache;
  listScopes: typeof listTicketCacheScopes;
};

const baseDeps: TicketCacheDeps = {
  getOwnerId: () => useAuthStore.getState().session?.user.id ?? null,
  isOffline: () => useOfflineStore.getState().isOffline,
  read: readTicketCache,
  write: writeTicketCache,
  listScopes: listTicketCacheScopes,
};

let overrides: Partial<TicketCacheDeps> | null = null;

function resolveDeps(): TicketCacheDeps {
  if (!overrides) {
    return baseDeps;
  }
  return {
    getOwnerId: overrides.getOwnerId ?? baseDeps.getOwnerId,
    isOffline: overrides.isOffline ?? baseDeps.isOffline,
    read: overrides.read ?? baseDeps.read,
    write: overrides.write ?? baseDeps.write,
    listScopes: overrides.listScopes ?? baseDeps.listScopes,
  };
}

export function __setTicketCacheDeps(mock?: Partial<TicketCacheDeps>) {
  overrides = mock ?? null;
}

export function serializeScope(name: string, params?: Record<string, unknown>) {
  if (!params || !Object.keys(params).length) {
    return name;
  }
  const stableEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  const encoded = stableEntries
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join("|");
  return `${name}:${encoded}`;
}

export async function primeTicketCacheEntries(
  entries: Array<{ scope: string; payload: unknown }>,
) {
  if (!entries.length) {
    return;
  }
  const { getOwnerId, write } = resolveDeps();
  const ownerId = getOwnerId();
  if (!ownerId) {
    return;
  }
  for (const entry of entries) {
    await write({ ownerId, scope: entry.scope }, entry.payload);
  }
}

type TicketLike = { id?: string | null } & Record<string, unknown>;

export async function getCachedTicket<T = TicketLike>(ticketId: string) {
  const { getOwnerId, read } = resolveDeps();
  const ownerId = getOwnerId();
  if (!ownerId) {
    return null;
  }
  const scope = serializeScope("tickets:item", { ticketId });
  const cached = await read<T>({ ownerId, scope });
  return cached ?? null;
}

export async function upsertTicketCaches(
  ticket: TicketLike,
  options?: { listScopes?: string[] },
) {
  const { getOwnerId, read, write, listScopes } = resolveDeps();
  const ownerId = getOwnerId();
  if (!ownerId || !ticket?.id) {
    return;
  }

  const detailScope = serializeScope("tickets:item", {
    ticketId: ticket.id,
  });
  await write({ ownerId, scope: detailScope }, ticket);

  const combinedScopes = new Set<string>(options?.listScopes ?? []);
  const cachedScopes = await listScopes(ownerId, "tickets:list");
  cachedScopes.forEach((scope) => combinedScopes.add(scope));

  if (!combinedScopes.size) {
    return;
  }

  for (const scope of combinedScopes) {
    const cached = await read<TicketLike[]>({ ownerId, scope });
    if (!Array.isArray(cached) || !cached.length) {
      continue;
    }
    let updated = false;
    const next = cached.map((entry) => {
      if (entry?.id === ticket.id) {
        updated = true;
        return { ...entry, ...ticket };
      }
      return entry;
    });

    if (!updated) {
      continue;
    }

    await write({ ownerId, scope }, next);
  }
}

export async function withTicketCache<T>(
  scope: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const { getOwnerId, isOffline, read, write } = resolveDeps();
  const ownerId = getOwnerId();
  if (!ownerId) {
    return fetcher();
  }

  const offline = isOffline();
  const cached = await read<T>({ ownerId, scope });

  if (offline && cached) {
    return cached;
  }

  if (offline && !cached) {
    throw new Error("OFFLINE_CACHE_MISS");
  }

  try {
    const data = await fetcher();
    await write({ ownerId, scope }, data);
    return data;
  } catch (error) {
    if (cached) {
      console.warn(`Falling back to cached payload for ${scope}`, error);
      return cached;
    }
    throw error;
  }
}
