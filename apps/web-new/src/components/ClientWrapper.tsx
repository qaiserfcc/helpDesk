"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

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

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}