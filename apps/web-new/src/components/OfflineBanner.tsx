import { useOfflineStore } from "@/store/useOfflineStore";

export function OfflineBanner() {
  const isOffline = useOfflineStore((state) => state.isOffline);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
      You are currently offline. Some features may be limited.
    </div>
  );
}