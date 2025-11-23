import { create } from "zustand";
import * as LocalAuthentication from "expo-local-authentication";
import * as Network from "expo-network";
import {
  login,
  refresh,
  register,
  type LoginInput,
  type RegisterInput,
} from "@/services/auth";
import {
  cacheLoginPayload,
  cacheSignupPayload,
  clearAuthIntent,
  countAuthIntents,
  enqueueAuthIntent,
  hashPassword,
  listAuthIntents,
  readCachedLoginPayload,
} from "@/storage/auth-cache";
import {
  clearSecureKey,
  readSecureJSON,
  writeSecureJSON,
} from "@/storage/secureStore";
import { useOfflineStore } from "@/store/useOfflineStore";

const SESSION_KEY = "helpdesk_session";
const OFFLINE_SESSION_KEY = "helpdesk_offline_session";

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
  offlineSession: boolean;
  staleSession: boolean;
  authQueueLength: number;
  bootstrap: () => Promise<void>;
  applySession: (
    session: AuthSession,
    options?: { offline?: boolean },
  ) => Promise<void>;
  signOut: (options?: { forgetOfflineSnapshot?: boolean }) => Promise<void>;
  forgetOfflineSnapshot: () => Promise<void>;
  resumeOfflineSession: (payload: LoginInput) => Promise<boolean>;
  cacheLoginPayload: (payload: LoginInput) => Promise<void>;
  cacheSignupPayload: (
    payload: RegisterInput & { role: UserRole },
  ) => Promise<void>;
  queueAuthIntent: (
    intent: Parameters<typeof enqueueAuthIntent>[0],
  ) => Promise<void>;
  refreshAuthQueueSize: () => Promise<void>;
  flushAuthIntents: () => Promise<void>;
  refreshSession: () => Promise<void>;
  markSessionStale: () => void;
};

async function persistSession(session: AuthSession | null) {
  if (!session) {
    await clearSecureKey(SESSION_KEY);
    return;
  }
  await writeSecureJSON(SESSION_KEY, session);
}

async function readPersistedSession() {
  return readSecureJSON<AuthSession>(SESSION_KEY);
}

async function persistOfflineSnapshot(session: AuthSession | null) {
  if (!session) {
    return;
  }
  await writeSecureJSON(OFFLINE_SESSION_KEY, session);
}

async function readOfflineSnapshot() {
  return readSecureJSON<AuthSession>(OFFLINE_SESSION_KEY);
}

async function clearOfflineSnapshot() {
  await clearSecureKey(OFFLINE_SESSION_KEY);
}

async function requireBiometricUnlock() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return true;
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Help Desk",
      fallbackLabel: "Use device passcode",
      cancelLabel: "Cancel",
    });
    return result.success;
  } catch (error) {
    console.warn("Biometric unlock failed", error);
    return false;
  }
}

async function deviceLooksOffline() {
  try {
    const state = await Network.getNetworkStateAsync();
    return !(state.isConnected && state.isInternetReachable);
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  offlineSession: false,
  staleSession: false,
  authQueueLength: 0,
  bootstrap: async () => {
    let session = await readPersistedSession();
    const queueLength = await countAuthIntents();
    let offlineSession = false;

    if (!session) {
      const cachedPayload = await readCachedLoginPayload();
      const snapshot = await readOfflineSnapshot();
      if (cachedPayload && snapshot) {
        let offlineState = useOfflineStore.getState().isOffline;
        if (!offlineState) {
          offlineState = await deviceLooksOffline();
        }
        if (offlineState) {
          const approved = await requireBiometricUnlock();
          if (approved) {
            session = snapshot;
            offlineSession = true;
            await persistSession(snapshot);
          }
        }
      }
    }
    set({
      session,
      initialized: true,
      offlineSession,
      staleSession: false,
      authQueueLength: queueLength,
    });
  },
  applySession: async (
    session: AuthSession,
    options?: { offline?: boolean },
  ) => {
    await persistSession(session);
    if (!options?.offline) {
      await persistOfflineSnapshot(session);
    }
    set({
      session,
      initialized: true,
      offlineSession: options?.offline ?? false,
      staleSession: false,
    });
  },
  signOut: async (options) => {
    await persistSession(null);
    if (options?.forgetOfflineSnapshot) {
      await clearOfflineSnapshot();
    }
    set({
      session: null,
      initialized: true,
      offlineSession: false,
      staleSession: false,
    });
  },
  forgetOfflineSnapshot: async () => {
    await clearOfflineSnapshot();
  },
  resumeOfflineSession: async (payload: LoginInput) => {
    const cached = await readCachedLoginPayload();
    if (!cached) {
      return false;
    }
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (cached.email !== normalizedEmail) {
      return false;
    }
    const hashedPassword = await hashPassword(payload.password);
    if (hashedPassword !== cached.passwordHash) {
      return false;
    }
    const storedSession =
      (await readPersistedSession()) ?? (await readOfflineSnapshot());
    if (!storedSession) {
      return false;
    }
    const approved = await requireBiometricUnlock();
    if (!approved) {
      return false;
    }
    set({ session: storedSession, initialized: true, offlineSession: true });
    return true;
  },
  cacheLoginPayload: (payload: LoginInput) => cacheLoginPayload(payload),
  cacheSignupPayload: (payload: RegisterInput & { role: UserRole }) =>
    cacheSignupPayload(payload),
  queueAuthIntent: async (intent: Parameters<typeof enqueueAuthIntent>[0]) => {
    await enqueueAuthIntent(intent);
    await get().refreshAuthQueueSize();
  },
  refreshAuthQueueSize: async () => {
    const authQueueLength = await countAuthIntents();
    set({ authQueueLength });
  },
  flushAuthIntents: async () => {
    const intents = await listAuthIntents();
    if (!intents.length) {
      set({ authQueueLength: 0 });
      return;
    }
    for (const intent of intents) {
      try {
        if (intent.type === "login") {
          const session = await login(intent.payload);
          await get().cacheLoginPayload(intent.payload);
          await get().applySession(session);
        } else {
          const normalizedRole = intent.payload.role ?? "user";
          const session = await register(intent.payload);
          await get().cacheSignupPayload({
            ...intent.payload,
            role: normalizedRole,
          });
          await get().cacheLoginPayload({
            email: intent.payload.email,
            password: intent.payload.password,
          });
          await get().applySession(session);
        }
        await clearAuthIntent(intent.id);
      } catch (error) {
        console.warn(`Failed to replay ${intent.type} intent`, error);
      }
    }
    await get().refreshAuthQueueSize();
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
