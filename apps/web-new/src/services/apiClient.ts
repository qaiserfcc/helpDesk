import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { useAuthStore } from "@/store/useAuthStore";

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000,
});

function applyAuthHeader(
  headers: InternalAxiosRequestConfig["headers"],
  token: string,
) {
  const nextHeaders = AxiosHeaders.from(headers ?? {});
  nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

apiClient.interceptors.request.use((config) => {
  const session = useAuthStore.getState().session;
  if (session?.accessToken) {
    config.headers = applyAuthHeader(config.headers, session.accessToken);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    const store = useAuthStore.getState();
    const originalRequest = config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      response?.status === 401 &&
      store.session?.refreshToken &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${env.apiUrl}/auth/refresh`,
          { refreshToken: store.session.refreshToken },
          { timeout: 10000 },
        );

        const newSession = {
          user: refreshResponse.data.user,
          accessToken: refreshResponse.data.tokens.accessToken,
          refreshToken: refreshResponse.data.tokens.refreshToken,
        };

        await store.applySession(newSession);
        originalRequest.headers = applyAuthHeader(
          originalRequest.headers,
          newSession.accessToken,
        );

        return apiClient(originalRequest);
      } catch (refreshError) {
        await store.signOut();
        return Promise.reject(refreshError);
      }
    }

    if (response?.status === 401) {
      await store.signOut();
    }

    return Promise.reject(error);
  },
);