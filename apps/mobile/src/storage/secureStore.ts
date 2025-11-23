import * as SecureStore from "expo-secure-store";

const SECURE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;
const UNSUPPORTED_CHARACTERS = /[^A-Za-z0-9._-]/g;

function normalizeSecureKey(key: string) {
  const trimmedKey = key.trim();
  if (!trimmedKey) {
    throw new Error("SecureStore key cannot be empty");
  }
  if (SECURE_KEY_PATTERN.test(trimmedKey)) {
    return trimmedKey;
  }
  const sanitizedKey = trimmedKey.replace(UNSUPPORTED_CHARACTERS, "_");
  console.warn(
    `SecureStore key "${key}" contains unsupported characters. Using "${sanitizedKey}" instead.`,
  );
  return sanitizedKey;
}

export async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    console.warn("SecureStore availability check failed", error);
    return false;
  }
}

export async function writeSecureJSON(key: string, value: unknown | null) {
  try {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    const safeKey = normalizeSecureKey(key);
    if (value === null || value === undefined) {
      await SecureStore.deleteItemAsync(safeKey);
      return;
    }
    await SecureStore.setItemAsync(safeKey, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist key ${key}`, error);
  }
}

export async function readSecureJSON<T>(key: string): Promise<T | null> {
  try {
    if (!(await isSecureStoreAvailable())) {
      return null;
    }
    const safeKey = normalizeSecureKey(key);
    const rawValue = await SecureStore.getItemAsync(safeKey);
    if (!rawValue) {
      return null;
    }
    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  } catch (error) {
    console.warn(`Failed to read key ${key}`, error);
    return null;
  }
}

export async function clearSecureKey(key: string) {
  try {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    const safeKey = normalizeSecureKey(key);
    await SecureStore.deleteItemAsync(safeKey);
  } catch (error) {
    console.warn(`Failed to delete key ${key}`, error);
  }
}
