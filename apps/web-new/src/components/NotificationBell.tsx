"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/store/useNotificationStore";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, dismissNotification } = useNotificationStore();
  const router = useRouter();
  
  // Render popover inline within the header so it anchors to the bell.
  // Use absolute positioning relative to this container so we do not
  // need to compute inline top/left values or create a portal.
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const [anchor, setAnchor] = useState<null | { left: number; top: number }>(null);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // mark read when opening, so badge clears for the user
      markAllRead();
    }
  };

  useLayoutEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const width = 320; // matches w-80
      const maxRight = window.innerWidth - 8; // 8px margin
      let left = rect.right - width;
      if (left < 8) left = rect.left; // fallback to left side of button if near the edge
      if (left + width > maxRight) {
        left = Math.max(8, maxRight - width);
      }
      setAnchor({ left, top: rect.bottom + 8 });
    } else {
      setAnchor(null);
    }
  }, [open]);

  const handleGoToTicket = (ticketId: string) => {
    setOpen(false);
    router.push(`/ticket/${ticketId}`);
  };

  return (
    <div className="relative">
          <button
            ref={bellRef}
        onClick={handleOpen}
        aria-label="Open notifications"
        className="p-2 rounded-md hover:bg-white/5 relative"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C8.67 6.165 8 7.388 8 8.75v5.407c0 .538-.214 1.053-.595 1.437L6 17h9z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{unreadCount}</span>
        )}
      </button>

      {open && anchor && createPortal(
          <div
            className="w-80 bg-white/5 border border-white/10 rounded-md shadow-lg notification-popover overflow-hidden z-50"
            style={{ ['--notif-left' as any]: `${anchor.left}px`, ['--notif-top' as any]: `${anchor.top}px` }}
            role="dialog"
            aria-label="Notifications drawer"
          >
          <div className="p-2 border-b border-white/6 flex justify-between items-center">
            <strong className="text-white">Notifications</strong>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { markAllRead(); }}
                className="text-sm text-white/70 hover:text-white"
              >
                Mark read
              </button>
              <button
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="dismiss text-white hover:text-white/80"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-white/70">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 border-b border-white/6 ${n.read ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleGoToTicket(n.ticketId)}>
                      <div className="text-white text-sm font-medium">{n.actor}</div>
                      <div className="text-white/80 text-sm mt-1">{n.summary}</div>
                      <div className="text-xs text-white/60 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                        className="text-white/60 hover:text-white"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-white/6 text-center">
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-white/70 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>, document.body)}
    </div>
  );
}
