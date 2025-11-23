import { describe, it, expect } from "vitest";
import { validateUserForm, MIN_PASSWORD_LENGTH } from "./userFormValidation";

const baseForm = {
  name: "Casey Admin",
  email: "casey@example.com",
  role: "admin" as const,
  password: "secrets",
};

describe("validateUserForm", () => {
  it("accepts a complete and valid payload", () => {
    const result = validateUserForm(baseForm, { requirePassword: true });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rejects short names", () => {
    const result = validateUserForm({ ...baseForm, name: "A" });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toMatch(/Name must be at least/);
  });

  it("rejects invalid email addresses", () => {
    const result = validateUserForm({ ...baseForm, email: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBe("Enter a valid email address.");
  });

  it("requires a password when flagged", () => {
    const result = validateUserForm(
      { ...baseForm, password: "   " },
      { requirePassword: true },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBe("Password is required for new users.");
  });

  it("allows empty password when optional", () => {
    const result = validateUserForm(
      { ...baseForm, password: "" },
      { requirePassword: false },
    );
    expect(result.valid).toBe(true);
    expect(result.errors.password).toBeUndefined();
  });

  it("validates optional password length when provided", () => {
    const tooShort = "x".repeat(MIN_PASSWORD_LENGTH - 1);
    const result = validateUserForm(
      { ...baseForm, password: tooShort },
      { requirePassword: false },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.password).toMatch(/Password must be at least/);
  });
});
