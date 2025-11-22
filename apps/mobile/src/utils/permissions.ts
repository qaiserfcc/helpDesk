import type { UserRole } from "@/store/useAuthStore";

export type DerivedPermissions = {
  role: UserRole | null;
  isAdmin: boolean;
  isAgent: boolean;
  isUser: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canViewAllocations: boolean;
  canAccessAgentTools: boolean;
};

export function derivePermissions(role: UserRole | null | undefined): DerivedPermissions {
  const normalizedRole = role ?? null;
  const isAdmin = normalizedRole === "admin";
  const isAgent = normalizedRole === "agent";
  const isUser = normalizedRole === "user";

  return {
    role: normalizedRole,
    isAdmin,
    isAgent,
    isUser,
    canManageUsers: isAdmin,
    canViewReports: isAdmin || isAgent,
    canViewAllocations: isAdmin,
    canAccessAgentTools: isAdmin || isAgent,
  };
}

export function hasRequiredRole(
  role: UserRole | null,
  allowedRoles: ReadonlyArray<UserRole>,
) {
  if (!role) {
    return false;
  }
  return allowedRoles.includes(role);
}
