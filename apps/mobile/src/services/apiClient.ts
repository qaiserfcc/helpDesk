import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000,
});

// Debug: Surface current API base url in console so developer can verify network requests go to expected host.
console.debug("apiClient: baseURL", env.apiUrl);

function applyAuthHeader(
  headers: InternalAxiosRequestConfig["headers"],
  token: string,
) {
  const nextHeaders = AxiosHeaders.from(headers ?? {});
  nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

let tokenProvider: (() => string | undefined) | undefined;
let applySessionHandler: ((session: any) => Promise<void>) | undefined;
let signOutHandler: (() => Promise<void>) | undefined;
let getSessionHandler: (() => { accessToken?: string; refreshToken?: string } | null) | undefined;

export function registerAuthTokenProvider(fn: () => string | undefined) {
  tokenProvider = fn;
}

export function registerAuthHandlers(handlers: {
  applySession?: (session: any) => Promise<void>;
  signOut?: () => Promise<void>;
  getSession?: () => { accessToken?: string; refreshToken?: string } | null;
}) {
  applySessionHandler = handlers.applySession;
  signOutHandler = handlers.signOut;
  getSessionHandler = handlers.getSession;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenProvider?.();
  if (token) {
    config.headers = applyAuthHeader(config.headers, token);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    try {
      const status = error.response?.status;
      if (status && status >= 500) {
        console.error("apiClient: Server error for request:", error.config?.url, "status:", status, "response:", error.response?.data);
      }
    } catch (logErr) {
      console.error("apiClient: failed to log error details", logErr);
    }
    const { response, config } = error;
    const store = {
      session: getSessionHandler ? getSessionHandler() : undefined,
      applySession: applySessionHandler,
      signOut: signOutHandler,
    };
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

        await store.applySession?.(newSession);
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
