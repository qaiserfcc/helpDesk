import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_API_URL = "http://localhost:4000/api";
const FALLBACK_ENV = "development";

const stripProtocol = (hostUri?: string | null) => {
  if (!hostUri) return null;
  return hostUri.replace(/^https?:\/\//, "").replace(/^exp:\/\//, "");
};

const normalizeHost = (host?: string | null) => {
  if (!host) {
    return null;
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return Platform.OS === "android" ? "10.0.2.2" : "localhost";
  }

  return host;
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
  const normalized = normalizeHost(host);
  return normalized ? `http://${normalized}:4000/api` : null;
};

const resolveFromScriptUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;

  if (!scriptURL) {
    return null;
  }

  try {
    const url = new URL(scriptURL);
    const normalized = normalizeHost(url.hostname);
    return normalized ? `http://${normalized}:4000/api` : null;
  } catch {
    return null;
  }
};

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  resolveDevHost() ??
  resolveFromScriptUrl() ??
  DEFAULT_API_URL;

const apiBaseUrl = apiUrl.replace(/\/api\/?$/, "");

export const env = {
  apiUrl,
  apiBaseUrl,
  environment: process.env.EXPO_PUBLIC_ENV ?? FALLBACK_ENV,
};
