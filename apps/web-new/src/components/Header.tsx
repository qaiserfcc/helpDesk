"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";

export function Header() {
  const { session } = useAuthStore();
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const adminLinks = [
    { href: "/category-management", label: "Categories", icon: "🗂️" },
    { href: "/sla-management", label: "SLAs", icon: "⏱️" },
    { href: "/workflow-management", label: "Workflows", icon: "🔄" },
    { href: "/attribute-management", label: "Attributes", icon: "🏷️" },
    { href: "/agent-assignment", label: "Agent Assignments", icon: "👥" },
    { href: "/agent-skills", label: "Agent Skills", icon: "⭐" },
    { href: "/knowledge-base", label: "Knowledge Base", icon: "📚" },
    { href: "/canned-responses", label: "Canned Responses", icon: "💬" },
  ];

  if (!session) return null;

  return (
    <header className="bg-transparent shadow-sm backdrop-blur-md sticky top-0 z-[2000] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 gap-6">
          <h1 className="text-2xl font-bold text-white whitespace-nowrap bg-gradient-to-r from-white to-white/80 bg-clip-text">
            Help Desk
          </h1>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            <Link href="/tickets" className="hover:text-white transition-colors font-medium">
              Tickets
            </Link>
            {(session.user.role === "admin" || session.user.role === "agent") && (
              <div className="relative z-[2000]">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="hover:text-white transition-colors flex items-center gap-2 font-medium px-3 py-1.5 rounded-md hover:bg-white/10"
                >
                  Admin Tools
                  <svg className="w-4 h-4 transition-transform" style={{ transform: showAdminMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </button>
                {showAdminMenu && (
                  <div className="absolute top-full mt-2 left-0 bg-white/10 backdrop-blur-xl rounded-xl shadow-2xl py-2 min-w-[240px] z-[2100] border border-white/20">
                    {adminLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-white transition-all group"
                        onClick={() => setShowAdminMenu(false)}
                      >
                        <span className="text-lg">{link.icon}</span>
                        <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <NotificationBell />
            <span className="text-sm text-white/80 hidden sm:inline">Welcome, {session.user.name}</span>
            <button
              onClick={() => useAuthStore.getState().signOut()}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 backdrop-blur-sm border border-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
