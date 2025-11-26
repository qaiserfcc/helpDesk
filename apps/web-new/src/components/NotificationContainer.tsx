import { useToastStore } from "@/store/useToastStore";
import { NotificationItem } from "./NotificationItem";

export function NotificationContainer() {
  const { notifications, dismissNotification } = useToastStore();

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