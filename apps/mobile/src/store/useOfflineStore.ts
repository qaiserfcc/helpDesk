import { create } from "zustand";

type OfflineState = {
  isOffline: boolean;
  lastChangedAt: number | null;
  setOffline: (value: boolean) => void;
};

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  lastChangedAt: null,
  setOffline: (value: boolean) =>
    set({
      isOffline: value,
      lastChangedAt: Date.now(),
    }),
}));
