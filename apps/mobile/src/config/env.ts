import Constants from "expo-constants";

const DEFAULT_API_URL = "http://localhost:4000/api";
const FALLBACK_ENV = "development";

const stripProtocol = (hostUri?: string | null) => {
  if (!hostUri) return null;
  return hostUri.replace(/^https?:\/\//, "").replace(/^exp:\/\//, "");
};

const resolveDevHost = () => {
  const candidate =
    stripProtocol(Constants.expoConfig?.hostUri) ??
    stripProtocol(Constants.manifest?.hostUri) ??
    stripProtocol(Constants.manifest2?.extra?.expoClient?.hostUri);

  if (!candidate) {
    return null;
  }

  const [host] = candidate.split(":");
  return host ? `http://${host}:4000/api` : null;
};

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? resolveDevHost() ?? DEFAULT_API_URL;

const apiBaseUrl = apiUrl.replace(/\/api\/?$/, "");

export const env = {
  apiUrl,
  apiBaseUrl,
  environment: process.env.EXPO_PUBLIC_ENV ?? FALLBACK_ENV,
};
