"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: ("admin" | "agent" | "user")[];
}

export function Sidebar() {
  const { session } = useAuthStore();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("main");

  if (!session) return null;

  const mainNavItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/tickets", label: "Tickets", icon: "🎫" },
  ];

  const adminNavItems: NavItem[] = [
    { href: "/category-management", label: "Categories", icon: "🗂️", roles: ["admin", "agent"] },
    { href: "/sla-management", label: "SLAs", icon: "⏱️", roles: ["admin", "agent"] },
    { href: "/workflow-management", label: "Workflows", icon: "🔄", roles: ["admin", "agent"] },
    { href: "/attribute-management", label: "Attributes", icon: "🏷️", roles: ["admin", "agent"] },
    { href: "/agent-assignment", label: "Agent Assignments", icon: "👥", roles: ["admin"] },
    { href: "/agent-skills", label: "Agent Skills", icon: "⭐", roles: ["admin"] },
    { href: "/knowledge-base", label: "Knowledge Base", icon: "📚", roles: ["admin", "agent"] },
    { href: "/canned-responses", label: "Canned Responses", icon: "💬", roles: ["admin", "agent"] },
    { href: "/user-management", label: "Users", icon: "👤", roles: ["admin"] },
  ];

  const reportNavItems: NavItem[] = [
    { href: "/reports", label: "Reports", icon: "📈", roles: ["admin", "agent"] },
    { href: "/status-summary", label: "Status Summary", icon: "📋", roles: ["admin"] },
  ];

  const filterByRole = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.roles) return true;
      const userRole = session.user.role as "admin" | "agent" | "user";
      return item.roles.includes(userRole);
    });
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const NavSection = ({ 
    title, 
    items, 
    sectionKey 
  }: { 
    title: string; 
    items: NavItem[]; 
    sectionKey: string;
  }) => {
    const filteredItems = filterByRole(items);
    if (filteredItems.length === 0) return null;

    const isExpanded = expandedSection === sectionKey;

    return (
      <div className="mb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-white/60 hover:text-white/90 transition-colors"
        >
          <span>{title}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {filteredItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 transition-all group ${
                  isActive(item.href)
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[3000] p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[2000]"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white/5 backdrop-blur-xl border-r border-white/10
          transform transition-transform duration-300 ease-in-out z-[2500]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between px-4 py-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white text-xl font-bold">HD</span>
              </div>
              <h1 className="text-xl font-bold text-white">HelpDesk</h1>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* Main Navigation */}
            <div className="space-y-1 mb-4">
              {filterByRole(mainNavItems).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 transition-all group ${
                    isActive(item.href)
                      ? "bg-white/20 text-white shadow-lg"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Admin Tools */}
            {(session.user.role === "admin" || session.user.role === "agent") && (
              <NavSection
                title="Admin Tools"
                items={adminNavItems}
                sectionKey="admin"
              />
            )}

            {/* Reports */}
            {(session.user.role === "admin" || session.user.role === "agent") && (
              <NavSection
                title="Reports & Analytics"
                items={reportNavItems}
                sectionKey="reports"
              />
            )}
          </nav>

          {/* User Profile & Actions */}
          <div className="border-t border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-white/60 truncate">{session.user.role}</p>
              </div>
            </div>
            <button
              onClick={() => useAuthStore.getState().signOut()}
              className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 border border-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
