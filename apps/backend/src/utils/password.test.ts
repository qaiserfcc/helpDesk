import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password utils", () => {
  it("hashes and verifies the same password", async () => {
    const hash = await hashPassword("StrongPassw0rd!");
    await expect(verifyPassword("StrongPassw0rd!", hash)).resolves.toBe(true);
  });

  it("fails verification for a mismatched password", async () => {
    const hash = await hashPassword("AnotherPass123!");
    await expect(verifyPassword("WrongPass123!", hash)).resolves.toBe(false);
  });
});
