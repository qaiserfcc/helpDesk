import { Notification } from "@/store/useToastStore";

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const getNotificationStyles = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-600 border-green-600 text-white";
      case "error":
        return "bg-red-600 border-red-600 text-white";
      case "warning":
        return "bg-yellow-600 border-yellow-600 text-white";
      case "info":
      default:
        return "bg-blue-600 border-blue-600 text-white";
    }
  };

  return (
    <div
      className={`border-l-4 p-4 rounded-r-md shadow-sm ${getNotificationStyles(
        notification.type
      )}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-sm text-white">{notification.title}</h4>
          <p className="text-sm mt-1 text-white/90">{notification.message}</p>
          {notification.timestamp && (
            <p className="text-xs mt-2 text-white/70">
              {new Date(notification.timestamp).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="ml-4 text-white bg-white/12 hover:bg-white/20 transition-colors px-2 py-1 rounded border border-white/10"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}