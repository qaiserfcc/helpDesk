import { describe, beforeEach, it, expect } from "vitest";
import {
  useNotificationStore,
  type NotificationBase,
} from "./useNotificationStore";

let nextId = 0;
const factory = (
  overrides: Partial<NotificationBase> = {},
): NotificationBase => ({
  id: `notif-${nextId++}`,
  ticketId: "T-100",
  actor: "Agent",
  summary: "Updated ticket",
  createdAt: new Date().toISOString(),
  type: "activity",
  ...overrides,
});

const resetStore = () => {
  useNotificationStore.setState({
    notifications: [],
    unreadCount: 0,
    toastQueue: [],
  });
};

describe("useNotificationStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("adds new notifications and tracks unread + toast queue", () => {
    const entry = factory();
    useNotificationStore.getState().addNotification(entry);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].read).toBe(false);
    expect(state.unreadCount).toBe(1);
    expect(state.toastQueue).toHaveLength(1);
  });

  it("deduplicates notifications by id", () => {
    const entry = factory({ id: "dup" });
    const store = useNotificationStore.getState();
    store.addNotification(entry);
    store.addNotification(entry);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.toastQueue).toHaveLength(1);
  });

  it("hydrates from history only once and marks entries as read", () => {
    const entries = [factory({ id: "h1" }), factory({ id: "h2" })];
    const store = useNotificationStore.getState();
    store.seedFromHistory(entries);

    let state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
    expect(state.notifications.every((item) => item.read)).toBe(true);
    expect(state.unreadCount).toBe(0);

    store.seedFromHistory([factory({ id: "ignored" })]);
    state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
  });

  it("marks a single notification as read", () => {
    const first = factory({ id: "n1" });
    const second = factory({ id: "n2" });
    const store = useNotificationStore.getState();
    store.addNotification(first);
    store.addNotification(second);

    store.markRead("n1");
    const state = useNotificationStore.getState();
    expect(state.notifications.find((n) => n.id === "n1")?.read).toBe(true);
    expect(state.notifications.find((n) => n.id === "n2")?.read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it("marks all notifications for a ticket as read", () => {
    const store = useNotificationStore.getState();
    store.addNotification(factory({ id: "a", ticketId: "ticket-a" }));
    store.addNotification(factory({ id: "b", ticketId: "ticket-a" }));
    store.addNotification(factory({ id: "c", ticketId: "ticket-b" }));

    store.markTicketRead("ticket-a");
    const state = useNotificationStore.getState();
    expect(
      state.notifications
        .filter((n) => n.ticketId === "ticket-a")
        .every((n) => n.read),
    ).toBe(true);
    expect(
      state.notifications.find((n) => n.ticketId === "ticket-b")?.read,
    ).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it("marks all notifications as read safely", () => {
    const store = useNotificationStore.getState();
    store.addNotification(factory());
    store.addNotification(factory());
    expect(useNotificationStore.getState().unreadCount).toBe(2);

    store.markAllRead();
    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.read)).toBe(true);
    expect(state.unreadCount).toBe(0);

    store.markAllRead();
    const unchanged = useNotificationStore.getState();
    expect(unchanged.notifications).toHaveLength(2);
  });

  it("clears the store", () => {
    const store = useNotificationStore.getState();
    store.addNotification(factory());
    store.addNotification(factory());
    store.dequeueToast();

    store.clearAll();
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
    expect(state.toastQueue).toHaveLength(0);
  });
});
