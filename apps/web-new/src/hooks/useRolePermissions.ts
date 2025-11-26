import { useAuthStore } from "@/store/useAuthStore";
import { getRolePermissions } from "@/utils/permissions";

export function useRolePermissions() {
  const user = useAuthStore((state) => state.session?.user);
  if (!user) {
    return [];
  }
  return getRolePermissions(user.role);
}