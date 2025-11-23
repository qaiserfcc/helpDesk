import type { UserRole } from "@/store/useAuthStore";

export const MIN_NAME_LENGTH = 2;
export const MIN_PASSWORD_LENGTH = 6;

export type UserFormValues = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>> & {
  general?: string;
};

export type UserFormValidationOptions = {
  requirePassword?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUserForm(
  values: UserFormValues,
  options: UserFormValidationOptions = {},
) {
  const errors: UserFormErrors = {};
  const trimmedName = values.name.trim();
  const trimmedEmail = values.email.trim();
  const trimmedPassword = values.password.trim();
  const mustIncludePassword = options.requirePassword ?? false;

  if (trimmedName.length < MIN_NAME_LENGTH) {
    errors.name = `Name must be at least ${MIN_NAME_LENGTH} characters.`;
  }

  if (!emailPattern.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (mustIncludePassword && trimmedPassword.length === 0) {
    errors.password = "Password is required for new users.";
  } else if (
    trimmedPassword.length > 0 &&
    trimmedPassword.length < MIN_PASSWORD_LENGTH
  ) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
