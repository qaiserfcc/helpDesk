const DEFAULT_API_URL = 'http://localhost:4000/api';

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development'
};
