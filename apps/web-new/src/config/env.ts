const DEFAULT_API_URL = "http://localhost:4000/api";
const FALLBACK_ENV = "development";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
const apiBaseUrl = apiUrl.replace(/\/api\/?$/, "");

export const env = {
  apiUrl,
  apiBaseUrl,
  environment: process.env.NEXT_PUBLIC_ENV ?? FALLBACK_ENV,
};