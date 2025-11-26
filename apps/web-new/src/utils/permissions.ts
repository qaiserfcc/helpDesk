import type { UserRole } from "@/store/useAuthStore";

export type Permission =
  | "tickets:create"
  | "tickets:view"
  | "tickets:update"
  | "tickets:assign"
  | "tickets:resolve"
  | "reports:view"
  | "admin:manage_users"
  | "admin:view_reports";

const rolePermissions: Record<UserRole, Permission[]> = {
  user: ["tickets:create", "tickets:view", "tickets:update"],
  agent: [
    "tickets:create",
    "tickets:view",
    "tickets:update",
    "tickets:assign",
    "tickets:resolve",
    "reports:view",
  ],
  admin: [
    "tickets:create",
    "tickets:view",
    "tickets:update",
    "tickets:assign",
    "tickets:resolve",
    "reports:view",
    "admin:manage_users",
    "admin:view_reports",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}