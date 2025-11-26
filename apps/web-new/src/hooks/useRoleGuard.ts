import { useAuthStore } from "@/store/useAuthStore";
import { hasPermission, type Permission } from "@/utils/permissions";

export function useRoleGuard(permission: Permission): boolean {
  const user = useAuthStore((state) => state.session?.user);
  if (!user) {
    return false;
  }
  return hasPermission(user.role, permission);
}