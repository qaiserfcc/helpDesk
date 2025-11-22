import { useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { derivePermissions } from "@/utils/permissions";

export function useRolePermissions() {
  const role = useAuthStore((state) => state.session?.user.role ?? null);
  return useMemo(() => derivePermissions(role), [role]);
}
