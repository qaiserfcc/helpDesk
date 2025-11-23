import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  readCachedLoginPayload: mockReadCachedLoginPayload,
  countAuthIntents: mockCountAuthIntents,
  readSecureJSON: mockReadSecureJSON,
  writeSecureJSON: mockWriteSecureJSON,
  clearSecureKey: mockClearSecureKey,
  hasHardwareAsync: mockHasHardwareAsync,
  isEnrolledAsync: mockIsEnrolledAsync,
  authenticateAsync: mockAuthenticateAsync,
  getNetworkStateAsync: mockGetNetworkStateAsync,
} = vi.hoisted(() => ({
  readCachedLoginPayload: vi.fn(),
  countAuthIntents: vi.fn(),
  readSecureJSON: vi.fn(),
  writeSecureJSON: vi.fn(),
  clearSecureKey: vi.fn(),
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn(),
  getNetworkStateAsync: vi.fn(),
}));

vi.mock("@/storage/auth-cache", () => ({
  cacheLoginPayload: vi.fn(),
  cacheSignupPayload: vi.fn(),
  clearAuthIntent: vi.fn(),
  countAuthIntents: mockCountAuthIntents,
  enqueueAuthIntent: vi.fn(),
  hashPassword: vi.fn(),
  listAuthIntents: vi.fn(),
  readCachedLoginPayload: mockReadCachedLoginPayload,
}));

vi.mock("@/storage/secureStore", () => ({
  clearSecureKey: mockClearSecureKey,
  readSecureJSON: mockReadSecureJSON,
  writeSecureJSON: mockWriteSecureJSON,
}));

vi.mock("@/store/useOfflineStore", () => {
  const state = { isOffline: false, lastChangedAt: null };
  const selector = Object.assign(() => state, {
    getState: () => state,
    setState: vi.fn(),
    subscribe: vi.fn(),
  });
  return { useOfflineStore: selector };
});

vi.mock("expo-local-authentication", () => ({
  hasHardwareAsync: mockHasHardwareAsync,
  isEnrolledAsync: mockIsEnrolledAsync,
  authenticateAsync: mockAuthenticateAsync,
}));

vi.mock("expo-network", () => ({
  getNetworkStateAsync: mockGetNetworkStateAsync,
}));

import { useAuthStore } from "./useAuthStore";

describe("useAuthStore offline bootstrap", () => {
  beforeEach(() => {
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    mockReadCachedLoginPayload.mockResolvedValue({
      email: "offline@example.com",
      passwordHash: "hash",
      cachedAt: Date.now(),
    });
    mockCountAuthIntents.mockResolvedValue(0);
    mockReadSecureJSON.mockReset();
    mockWriteSecureJSON.mockReset();
    mockClearSecureKey.mockReset();
    useAuthStore.setState({
      initialized: false,
      session: null,
      offlineSession: false,
      staleSession: false,
      authQueueLength: 0,
    });
  });

  it("restores cached snapshot when offline", async () => {
    const snapshot = {
      user: {
        id: "u1",
        name: "Offline User",
        email: "offline@example.com",
        role: "user",
      },
      accessToken: "cached-access",
      refreshToken: "cached-refresh",
    };
    mockReadSecureJSON.mockImplementation(async (key: string) => {
      if (key === "helpdesk_session") {
        return null;
      }
      if (key === "helpdesk_offline_session") {
        return snapshot;
      }
      return null;
    });

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.session).toEqual(snapshot);
    expect(state.offlineSession).toBe(true);
    expect(mockWriteSecureJSON).toHaveBeenCalledWith(
      "helpdesk_session",
      snapshot,
    );
  });

  it("clears offline snapshot when requested during sign out", async () => {
    mockReadSecureJSON.mockResolvedValue(null);
    await useAuthStore.getState().signOut({ forgetOfflineSnapshot: true });
    expect(mockClearSecureKey).toHaveBeenCalledWith("helpdesk_offline_session");
  });
});
