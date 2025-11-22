import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { startSyncLoop, stopSyncLoop } from "@/services/syncService";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/useAuthStore";
import {
  shutdownTicketSocket,
  syncTicketSocketSession,
} from "@/realtime/ticketSocket";

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  const accessToken = useAuthStore((state) => state.session?.accessToken ?? null);

  useEffect(() => {
    startSyncLoop();
    return () => stopSyncLoop();
  }, []);

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
