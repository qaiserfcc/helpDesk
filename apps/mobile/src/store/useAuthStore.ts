import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'helpdesk::token';

type AuthState = {
  initialized: boolean;
  token: string | null;
  bootstrap: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  token: null,
  bootstrap: async () => {
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token: storedToken, initialized: true });
  },
  signIn: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, initialized: true });
  },
  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, initialized: true });
  }
}));
