import { apiClient } from "./apiClient";
import type { AuthSession } from "@/store/useAuthStore";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthResponse = {
  user: AuthSession["user"];
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

function mapResponseToSession(data: AuthResponse): AuthSession {
  return {
    user: data.user,
    accessToken: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
  };
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", input);
  return mapResponseToSession(data);
}

export async function refresh(refreshToken: string): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthResponse>("/auth/refresh", {
    refreshToken,
  });
  return mapResponseToSession(data);
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", input);
  return mapResponseToSession(data);
}
