import { create } from "zustand";
import {
  login,
  refresh,
  register,
  type LoginInput,
  type RegisterInput,
} from "@/services/auth";

const SESSION_KEY = "helpdesk_session";

export type UserRole = "user" | "agent" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  initialized: boolean;
  session: AuthSession | null;
  staleSession: boolean;
  bootstrap: () => Promise<void>;
  applySession: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  markSessionStale: () => void;
};

async function persistSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function readPersistedSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) as AuthSession : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  staleSession: false,
  bootstrap: async () => {
    const session = await readPersistedSession();
    set({
      session,
      initialized: true,
      staleSession: false,
    });
  },
  applySession: async (session: AuthSession) => {
    await persistSession(session);
    set({
      session,
      initialized: true,
      staleSession: false,
    });
  },
  signOut: async () => {
    await persistSession(null);
    set({
      session: null,
      initialized: true,
      staleSession: false,
    });
  },
  refreshSession: async () => {
    const current = get().session;
    if (!current?.refreshToken) {
      return;
    }
    try {
      const nextSession = await refresh(current.refreshToken);
      await get().applySession(nextSession);
    } catch (error) {
      console.warn("Background token refresh failed", error);
      set({ staleSession: true });
    }
  },
  markSessionStale: () => set({ staleSession: true }),
}));