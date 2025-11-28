"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchRecentTicketActivity } from "@/services/tickets";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialized, session, bootstrap } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!initialized) return;

    const isAuthRoute = pathname === "/login" || pathname === "/register";
    const isAuthenticated = !!session;

    if (!isAuthenticated && !isAuthRoute) {
      router.push("/login");
    } else if (isAuthenticated && isAuthRoute) {
      router.push("/");
    }
  }, [initialized, session, pathname, router]);

  // seed recent activity as notifications on initial load
  useEffect(() => {
    if (!initialized || !session) return;
    (async () => {
      try {
        const entries = await fetchRecentTicketActivity(25);
        const notifications = entries.map((e) => ({
          id: e.id,
          ticketId: e.ticketId,
          actor: e.actor.name,
          summary: e.type === "assignment_request" ? `${e.actor.name} requested assignment` : e.type.replaceAll("_", " "),
          createdAt: e.createdAt,
          type: "activity" as const,
        }));
        useNotificationStore.getState().seedFromHistory(notifications);
      } catch (error) {
        // ignore seed errors
        console.warn("Failed to seed notifications", error);
      }
    })();
  }, [initialized, session]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}