import { apiClient } from "@/services/apiClient";
import type { UserRole } from "@/store/useAuthStore";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type UserFilters = {
  role?: UserRole;
};

export async function fetchUsers(filters: UserFilters = {}) {
  const response = await apiClient.get<{ users: UserSummary[] }>("/users", {
    params: filters,
  });
  return response.data.users;
}
