import * as Crypto from "expo-crypto";
import { writeSecureJSON, readSecureJSON } from "./secureStore";
import type { LoginInput, RegisterInput } from "@/services/auth";
import type { UserRole } from "@/store/useAuthStore";

const LOGIN_CACHE_KEY = "helpdesk_last_login";
const SIGNUP_CACHE_KEY = "helpdesk_last_signup";
const AUTH_INTENT_KEY = "helpdesk_auth_intents";

type LoginCachePayload = {
  email: string;
  passwordHash: string;
  cachedAt: number;
};

type SignupCachePayload = {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  cachedAt: number;
};

export type AuthIntent =
  | {
      id: string;
      type: "login";
      createdAt: number;
      payload: LoginInput;
    }
  | {
      id: string;
      type: "register";
      createdAt: number;
      payload: RegisterInput;
    };

async function hashSecret(secret: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, secret);
}

export async function cacheLoginPayload(payload: LoginInput) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const passwordHash = await hashSecret(payload.password);
  const record: LoginCachePayload = {
    email: normalizedEmail,
    passwordHash,
    cachedAt: Date.now(),
  };
  await writeSecureJSON(LOGIN_CACHE_KEY, record);
}

export async function cacheSignupPayload(
  payload: RegisterInput & { role: UserRole },
) {
  const passwordHash = await hashSecret(payload.password);
  const record: SignupCachePayload = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    passwordHash,
    cachedAt: Date.now(),
  };
  await writeSecureJSON(SIGNUP_CACHE_KEY, record);
}

export async function readCachedLoginPayload() {
  return readSecureJSON<LoginCachePayload>(LOGIN_CACHE_KEY);
}

export async function readCachedSignupPayload() {
  return readSecureJSON<SignupCachePayload>(SIGNUP_CACHE_KEY);
}

async function readAuthIntents(): Promise<AuthIntent[]> {
  const intents = await readSecureJSON<AuthIntent[]>(AUTH_INTENT_KEY);
  return intents ?? [];
}

async function writeAuthIntents(intents: AuthIntent[]) {
  await writeSecureJSON(AUTH_INTENT_KEY, intents);
}

export async function enqueueAuthIntent(
  intent: Omit<AuthIntent, "id" | "createdAt">,
) {
  const intents = await readAuthIntents();
  const nextIntent = {
    id: Crypto.randomUUID(),
    createdAt: Date.now(),
    ...intent,
  } as AuthIntent;
  await writeAuthIntents([...intents, nextIntent]);
  return nextIntent;
}

export async function listAuthIntents() {
  return readAuthIntents();
}

export async function clearAuthIntent(id: string) {
  const intents = await readAuthIntents();
  await writeAuthIntents(intents.filter((intent) => intent.id !== id));
}

export async function countAuthIntents() {
  const intents = await readAuthIntents();
  return intents.length;
}

export async function hashPassword(password: string) {
  return hashSecret(password);
}
