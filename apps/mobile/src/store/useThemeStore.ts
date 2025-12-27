import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  toggleTheme: async () => {
    const newMode = useThemeStore.getState().mode === 'dark' ? 'light' : 'dark';
    set({ mode: newMode });
    try {
      await SecureStore.setItemAsync('theme-mode', newMode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  },
  setTheme: async (mode: ThemeMode) => {
    set({ mode });
    try {
      await SecureStore.setItemAsync('theme-mode', mode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  },
  loadTheme: async () => {
    try {
      const savedMode = await SecureStore.getItemAsync('theme-mode');
      if (savedMode === 'light' || savedMode === 'dark') {
        set({ mode: savedMode });
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  },
}));
