import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "helpdesk::session";

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
  bootstrap: () => Promise<void>;
  applySession: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

async function persistSession(session: AuthSession | null) {
  if (session) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

function safeParseSession(raw: string | null): AuthSession | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  session: null,
  bootstrap: async () => {
    const storedSession = await SecureStore.getItemAsync(SESSION_KEY);
    set({ session: safeParseSession(storedSession), initialized: true });
  },
  applySession: async (session: AuthSession) => {
    await persistSession(session);
    set({ session, initialized: true });
  },
  signOut: async () => {
    await persistSession(null);
    set({ session: null, initialized: true });
  },
}));
