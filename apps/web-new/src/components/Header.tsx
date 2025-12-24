"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";

export function Header() {
  const { session } = useAuthStore();
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const adminLinks = [
    { href: "/category-management", label: "Categories" },
    { href: "/sla-management", label: "SLAs" },
    { href: "/workflow-management", label: "Workflows" },
    { href: "/attribute-management", label: "Attributes" },
    { href: "/agent-skills", label: "Agent Skills" },
    { href: "/knowledge-base", label: "Knowledge Base" },
    { href: "/canned-responses", label: "Canned Responses" },
  ];

  if (!session) return null;

  return (
    <header className="bg-transparent shadow-sm backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6 gap-6">
          <h1 className="text-3xl font-bold text-white whitespace-nowrap">Help Desk</h1>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            <Link href="/tickets" className="hover:text-white transition-colors">
              Tickets
            </Link>
            {(session.user.role === "admin" || session.user.role === "agent") && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Admin Tools
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </button>
                {showAdminMenu && (
                  <div className="absolute top-full mt-2 left-0 bg-slate-800 rounded-lg shadow-xl py-2 min-w-[200px] z-50 border border-slate-700">
                    {adminLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 hover:bg-slate-700 text-white transition-colors"
                        onClick={() => setShowAdminMenu(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <span className="text-sm text-white/80">Welcome, {session.user.name}</span>
            <button
              onClick={() => useAuthStore.getState().signOut()}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
