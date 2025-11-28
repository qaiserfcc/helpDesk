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

export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters long";
  }
  return null;
}

export function validateLoginForm(
  email: string,
  password: string,
): ValidationResult {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRegisterForm(
  name: string,
  email: string,
  password: string,
  role?: UserRole,
): ValidationResult {
  const errors: Record<string, string> = {};

  const nameError = validateName(name);
  if (nameError) {
    errors.name = nameError;
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (role && !["user", "agent", "admin"].includes(role)) {
    errors.role = "Invalid role";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}