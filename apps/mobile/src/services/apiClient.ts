import axios from 'axios';
import { env } from '@/config/env';
import { useAuthStore } from '@/store/useAuthStore';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  }
);
