import * as Network from "expo-network";
import { apiClient } from "@/services/apiClient";
import {
  listQueuedTickets,
  markTicketFailed,
  markTicketSynced,
  type TicketRow,
} from "@/storage/offline-db";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/useAuthStore";
import { serializeScope, upsertTicketCaches } from "@/services/ticketCache";
import type { Ticket } from "@/services/tickets";

let syncInterval: ReturnType<typeof setInterval> | undefined;
const DEFAULT_LIST_SCOPE = serializeScope("tickets:list");

export async function syncQueuedTickets() {
  const session = useAuthStore.getState().session;
  if (!session) {
    return;
  }
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected) {
    return;
  }

  const queued = await listQueuedTickets();
  if (!queued.length) {
    return;
  }

  let invalidatedTicketList = false;
  let invalidatedQueue = false;
  const touchedTickets = new Set<string>();

  for (const row of queued) {
    try {
      const payload = parsePayload(row.payload);
      const response = await apiClient.request<SyncResponse>({
        url: row.endpoint ?? "/tickets/sync",
        method: row.method ?? "POST",
        data: payload,
      });
      const ticketIds = await applySyncResult(row, response.data);
      ticketIds.forEach((id) => touchedTickets.add(id));
      if (row.ticketId) {
        touchedTickets.add(row.ticketId);
      }
      await markTicketSynced(row.id);
      invalidatedTicketList = true;
      invalidatedQueue = true;
    } catch (error) {
      console.warn("Sync failed", row.id, error);
      await markTicketFailed(row.id);
      invalidatedQueue = true;
      break;
    }
  }

  if (invalidatedTicketList) {
    await queryClient.invalidateQueries({
      queryKey: ["tickets"],
      exact: false,
    });
  }

  for (const ticketId of touchedTickets) {
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
  }

  if (invalidatedQueue) {
    await queryClient.invalidateQueries({ queryKey: ["queuedTickets"] });
  }
}

export function startSyncLoop(intervalMs = 30_000) {
  if (syncInterval) {
    return;
  }
  syncInterval = setInterval(() => {
    syncQueuedTickets().catch((error) =>
      console.error("sync loop error", error),
    );
  }, intervalMs);
}

export function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = undefined;
  }
}

type SyncResponse = {
  ticket?: Ticket;
  tickets?: Ticket[];
};

function parsePayload(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse queued payload", error);
    return {};
  }
}

async function applySyncResult(
  row: TicketRow,
  payload: SyncResponse = {},
): Promise<string[]> {
  const tickets = extractTickets(row, payload);
  if (!tickets.length) {
    return [];
  }

  for (const ticket of tickets) {
    if (!ticket?.id) {
      continue;
    }
    await upsertTicketCaches(
      {
        ...ticket,
        pendingSync: false,
        pendingAction: undefined,
        isLocalOnly: false,
      },
      { listScopes: [DEFAULT_LIST_SCOPE] },
    );
  }

  return tickets
    .map((ticket) => ticket.id)
    .filter((id): id is string => Boolean(id));
}

function extractTickets(row: TicketRow, payload: SyncResponse = {}): Ticket[] {
  if (row.action === "ticket.create") {
    if (Array.isArray(payload.tickets) && payload.tickets.length) {
      return payload.tickets.filter(Boolean) as Ticket[];
    }
    if (payload.ticket) {
      return [payload.ticket];
    }
    return [];
  }

  if (payload.ticket) {
    return [payload.ticket];
  }

  if (Array.isArray(payload.tickets)) {
    return payload.tickets.filter(Boolean) as Ticket[];
  }

  return [];
}
