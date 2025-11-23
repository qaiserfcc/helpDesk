import { useMemo } from "react";
import type { UserRole } from "@/store/useAuthStore";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { hasRequiredRole } from "@/utils/permissions";

export function useRoleGuard(allowedRoles: ReadonlyArray<UserRole>) {
  const permissions = useRolePermissions();
  const signature = useMemo(
    () => allowedRoles.slice().sort().join("|"),
    [allowedRoles],
  );

  const normalizedRoles = useMemo(() => {
    return allowedRoles.slice();
  }, [signature]);

  const isAuthorized = useMemo(() => {
    return hasRequiredRole(permissions.role, normalizedRoles);
  }, [normalizedRoles, permissions.role]);

  return {
    ...permissions,
    isAuthorized,
  };
}
