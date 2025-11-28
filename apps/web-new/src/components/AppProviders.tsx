"use client";

import { ReactNode, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import { ticketSocket } from "@/realtime/ticketSocket";
import { OfflineBanner } from "@/components/OfflineBanner";
import { NotificationContainer } from "@/components/NotificationContainer";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const { session, refreshSession } = useAuthStore();
  const { setOffline } = useOfflineStore();

  // Handle offline/online status
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOffline]);

  // Handle auth token refresh loop
  useEffect(() => {
    if (!session?.accessToken) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error("Failed to refresh token:", error);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [session?.accessToken, refreshSession]);

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (session?.accessToken) {
      ticketSocket.connect(session.accessToken);
    } else {
      ticketSocket.disconnect();
    }

    return () => {
      ticketSocket.disconnect();
    };
  }, [session?.accessToken]);

  // Reconnect socket when the browser regains online status
  useEffect(() => {
    const handleOnline = () => {
      const accessToken = useAuthStore.getState().session?.accessToken ?? null;
      if (accessToken) {
        ticketSocket.connect(accessToken);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <NotificationContainer />
      {children}
    </QueryClientProvider>
  );
}