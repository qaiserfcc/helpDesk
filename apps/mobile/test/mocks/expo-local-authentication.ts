export async function hasHardwareAsync() {
  return true;
}

export async function isEnrolledAsync() {
  return true;
}

export async function authenticateAsync() {
  return { success: true };
}

export default {
  hasHardwareAsync,
  isEnrolledAsync,
  authenticateAsync,
};
