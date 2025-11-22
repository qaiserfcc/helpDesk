import * as Network from "expo-network";
import { listQueuedTickets, markTicketSynced } from "@/storage/offline-db";
import { apiClient } from "@/services/apiClient";

let syncInterval: ReturnType<typeof setInterval> | undefined;

export async function syncQueuedTickets() {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected) {
    return;
  }

  const queued = await listQueuedTickets();
  if (!queued.length) {
    return;
  }

  for (const row of queued) {
    try {
      await apiClient.post("/tickets/sync", JSON.parse(row.payload));
      await markTicketSynced(row.id);
    } catch (error) {
      console.warn("Sync failed", row.id, error);
      break;
    }
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
