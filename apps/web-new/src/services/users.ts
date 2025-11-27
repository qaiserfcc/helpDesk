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

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type UpdateUserPayload = Partial<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
}>;

type UserListResponse = { users: UserSummary[] };
type UserResponse = { user: UserSummary };

export async function fetchUsers(filters: UserFilters = {}) {
  const response = await apiClient.get<UserListResponse>("/users", {
    params: filters,
  });
  return response.data.users;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await apiClient.post<UserResponse>("/users", payload);
  return response.data.user;
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  const response = await apiClient.patch<UserResponse>(
    `/users/${userId}`,
    payload,
  );
  return response.data.user;
}

export async function deleteUser(userId: string) {
  const response = await apiClient.delete<UserResponse>(`/users/${userId}`);
  return response.data.user;
}