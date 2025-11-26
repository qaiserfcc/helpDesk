import { ReactNode } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { Permission } from "@/utils/permissions";

interface RoleRestrictedViewProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleRestrictedView({
  permission,
  children,
  fallback = null,
}: RoleRestrictedViewProps) {
  const hasAccess = useRoleGuard(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}