import { create } from "zustand";
import type { Ticket } from "@/services/tickets";

type Mode = "create" | "edit";

type TicketModalState = {
  isOpen: boolean;
  mode: Mode;
  ticket: Ticket | null;
  onSaved?: () => void;
  openCreate: (onSaved?: () => void) => void;
  openEdit: (ticket: Ticket, onSaved?: () => void) => void;
  close: () => void;
};

export const useTicketModalStore = create<TicketModalState>((set) => ({
  isOpen: false,
  mode: "create",
  ticket: null,
  onSaved: undefined,
  openCreate: (onSaved) =>
    set({ isOpen: true, mode: "create", ticket: null, onSaved }),
  openEdit: (ticket, onSaved) =>
    set({ isOpen: true, mode: "edit", ticket, onSaved }),
  close: () => set({ isOpen: false, ticket: null, onSaved: undefined }),
}));
