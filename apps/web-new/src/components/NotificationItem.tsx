import { Notification } from "@/store/useToastStore";

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const getNotificationStyles = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
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
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-sm mt-1">{notification.message}</p>
          {notification.timestamp && (
            <p className="text-xs mt-2 opacity-75">
              {new Date(notification.timestamp).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}