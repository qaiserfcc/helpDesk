import * as Network from "expo-network";
import { apiClient } from "@/services/apiClient";
import {
  listQueuedTickets,
  markTicketFailed,
  markTicketSynced,
} from "@/storage/offline-db";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/useAuthStore";

let syncInterval: ReturnType<typeof setInterval> | undefined;

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

  for (const row of queued) {
    try {
      await apiClient.post("/tickets/sync", JSON.parse(row.payload));
      await markTicketSynced(row.id);
      await queryClient.invalidateQueries({
        queryKey: ["tickets"],
        exact: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["queuedTickets"] });
    } catch (error) {
      console.warn("Sync failed", row.id, error);
      await markTicketFailed(row.id);
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
