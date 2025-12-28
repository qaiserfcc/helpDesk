"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasPermission, type Permission } from "@/utils/permissions";
import { useAuthStore } from "@/store/useAuthStore";

const navItems: Array<{
  label: string;
  href: string;
  permission?: Permission;
}> = [
  { label: "Dashboard", href: "/" },
  { label: "Tickets", href: "/tickets" },
  { label: "Status Summary", href: "/status-summary", permission: "reports:view" },
  { label: "Reports", href: "/reports", permission: "reports:view" },
  { label: "Allocation", href: "/allocation-dashboard", permission: "reports:view" },
  { label: "User Management", href: "/user-management", permission: "admin:manage_users" },
  { label: "Attributes", href: "/attributes", permission: "admin:manage_users" },
  { label: "Categories", href: "/categories", permission: "admin:manage_users" },
  { label: "Subcategories", href: "/subcategories", permission: "admin:manage_users" },
  { label: "SLAs", href: "/slas", permission: "admin:manage_users" },
  { label: "Agent Assignment", href: "/agent-assignment", permission: "admin:manage_users" },
];

export function Sidebar() {
  const pathname = usePathname();
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return null;
  }

  const { role } = session.user;
  const items = navItems.filter((item) =>
    item.permission ? hasPermission(role, item.permission) : true,
  );

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-white/10 bg-white/5 backdrop-blur sticky top-0 min-h-screen">
      <div className="px-4 py-6 border-b border-white/10">
        <p className="text-sm text-white/70">Navigation</p>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
