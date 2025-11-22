import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startSyncLoop, stopSyncLoop } from "@/services/syncService";

const queryClient = new QueryClient();

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  useEffect(() => {
    startSyncLoop();
    return () => stopSyncLoop();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
