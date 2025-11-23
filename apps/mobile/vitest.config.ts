import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['vitest.setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'expo-local-authentication': path.resolve(__dirname, 'test/mocks/expo-local-authentication.ts'),
      'expo-network': path.resolve(__dirname, 'test/mocks/expo-network.ts'),
      'expo-sqlite': path.resolve(__dirname, 'test/mocks/expo-sqlite.ts'),
      'expo-crypto': path.resolve(__dirname, 'test/mocks/expo-crypto.ts'),
      'expo-constants': path.resolve(__dirname, 'test/mocks/expo-constants.ts'),
      'react-native': path.resolve(__dirname, 'test/mocks/react-native.ts'),
      'expo-secure-store': path.resolve(__dirname, 'test/mocks/expo-secure-store.ts'),
    },
  },
});
