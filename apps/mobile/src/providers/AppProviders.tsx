import React, { useEffect } from "react";
import * as Network from "expo-network";
import { QueryClientProvider } from "@tanstack/react-query";
import { startSyncLoop, stopSyncLoop } from "@/services/syncService";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import {
  shutdownTicketSocket,
  syncTicketSocketSession,
} from "@/realtime/ticketSocket";

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  const accessToken = useAuthStore(
    (state) => state.session?.accessToken ?? null,
  );
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const flushAuthIntents = useAuthStore((state) => state.flushAuthIntents);
  const setOffline = useOfflineStore((state) => state.setOffline);

  useEffect(() => {
    startSyncLoop();
    return () => stopSyncLoop();
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => {
        void refreshSession();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [refreshSession]);

  useEffect(() => {
    let subscription: Network.NetworkStateSubscription | null = null;
    let cancelled = false;

    async function syncNetworkStatus() {
      const state = await Network.getNetworkStateAsync();
      if (cancelled) {
        return;
      }
      const offline = !(state.isConnected && state.isInternetReachable);
      setOffline(offline);
      if (!offline) {
        void refreshSession();
        void flushAuthIntents();
      }
    }

    void syncNetworkStatus();

    subscription = Network.addNetworkStateListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable);
      setOffline(offline);
      if (!offline) {
        void refreshSession();
        void flushAuthIntents();
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [flushAuthIntents, refreshSession, setOffline]);

  useEffect(() => {
    syncTicketSocketSession(accessToken);
    return () => {
      shutdownTicketSocket();
    };
  }, [accessToken]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
