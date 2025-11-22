import { create } from "zustand";

const MAX_NOTIFICATIONS = 50;

export type NotificationBase = {
  id: string;
  ticketId: string;
  actor: string;
  summary: string;
  createdAt: string;
  type: "activity" | "ticket";
};

export type NotificationEntry = NotificationBase & {
  read: boolean;
};

type NotificationState = {
  notifications: NotificationEntry[];
  unreadCount: number;
  toastQueue: NotificationEntry[];
  addNotification: (entry: NotificationBase) => void;
  seedFromHistory: (entries: NotificationBase[]) => void;
  markRead: (id: string) => void;
  markTicketRead: (ticketId: string) => void;
  markAllRead: () => void;
  dequeueToast: () => void;
  clearAll: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  toastQueue: [],
  addNotification: (entry) =>
    set((state) => {
      const exists = state.notifications.find((item) => item.id === entry.id);
      if (exists) {
        return state;
      }
      const enriched: NotificationEntry = { ...entry, read: false };
      const notifications = [enriched, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      );
      return {
        notifications,
        unreadCount: state.unreadCount + 1,
        toastQueue: [...state.toastQueue, enriched],
      };
    }),
  seedFromHistory: (entries) =>
    set((state) => {
      if (state.notifications.length > 0 || entries.length === 0) {
        return state;
      }
      const hydrated = entries.slice(0, MAX_NOTIFICATIONS).map((entry) => ({
        ...entry,
        read: true,
      }));
      return { notifications: hydrated };
    }),
  markRead: (id) =>
    set((state) => {
      let deducted = 0;
      const notifications = state.notifications.map((notification) => {
        if (notification.id !== id || notification.read) {
          return notification;
        }
        deducted += 1;
        return { ...notification, read: true };
      });
      return {
        notifications,
        unreadCount: Math.max(0, state.unreadCount - deducted),
      };
    }),
  markTicketRead: (ticketId) =>
    set((state) => {
      let deducted = 0;
      const notifications = state.notifications.map((notification) => {
        if (notification.ticketId !== ticketId || notification.read) {
          return notification;
        }
        deducted += 1;
        return { ...notification, read: true };
      });
      return {
        notifications,
        unreadCount: Math.max(0, state.unreadCount - deducted),
      };
    }),
  markAllRead: () =>
    set((state) => {
      if (state.unreadCount === 0) {
        return state;
      }
      const notifications = state.notifications.map((notification) =>
        notification.read ? notification : { ...notification, read: true },
      );
      return { notifications, unreadCount: 0 };
    }),
  dequeueToast: () =>
    set((state) => ({ toastQueue: state.toastQueue.slice(1) })),
  clearAll: () => set({ notifications: [], unreadCount: 0, toastQueue: [] }),
}));
