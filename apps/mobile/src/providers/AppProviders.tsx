import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { startSyncLoop, stopSyncLoop } from "@/services/syncService";
import { queryClient } from "@/lib/queryClient";

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
