import { useToastStore } from "@/store/useToastStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { NotificationItem } from "./NotificationItem";
import { useEffect } from "react";

export function NotificationContainer() {
  const { notifications, dismissNotification } = useToastStore();
  const { toastQueue, dequeueToast } = useNotificationStore();

  // Bridge queued notification entries into the toast store so the
  // UI shows temporary toasts when new notifications are enqueued.
  useEffect(() => {
    if (!toastQueue || toastQueue.length === 0) return;

    // Consume queued notifications and forward them to the toast store.
    // We repeatedly dequeue so we don't run into stale closure issues.
    (async function drainQueue() {
      while (true) {
        const next = useNotificationStore.getState().toastQueue[0];
        if (!next) break;
        useToastStore.getState().addNotification({
          type: "info",
          title: next.actor || "Notification",
          message: next.summary || "",
          timestamp: next.createdAt,
        });
        // Remove it from the notification queue (not from history)
        useNotificationStore.getState().dequeueToast();
      }
    })();
  }, [toastQueue, dequeueToast]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}