import { describe, it, expect } from "vitest";
import { derivePermissions, hasRequiredRole } from "./permissions";

describe("derivePermissions", () => {
  it("detects admin capabilities", () => {
    const permissions = derivePermissions("admin");
    expect(permissions.isAdmin).toBe(true);
    expect(permissions.canManageUsers).toBe(true);
    expect(permissions.canViewReports).toBe(true);
    expect(permissions.canAccessAgentTools).toBe(true);
    expect(permissions.canViewAllocations).toBe(true);
  });

  it("detects agent capabilities", () => {
    const permissions = derivePermissions("agent");
    expect(permissions.isAgent).toBe(true);
    expect(permissions.canManageUsers).toBe(false);
    expect(permissions.canViewReports).toBe(true);
    expect(permissions.canAccessAgentTools).toBe(true);
    expect(permissions.canViewAllocations).toBe(false);
  });

  it("falls back to safe defaults when role is missing", () => {
    const permissions = derivePermissions(null);
    expect(permissions.isAdmin).toBe(false);
    expect(permissions.isAgent).toBe(false);
    expect(permissions.canManageUsers).toBe(false);
    expect(permissions.canViewReports).toBe(false);
  });
});

describe("hasRequiredRole", () => {
  it("returns true when role is included", () => {
    expect(hasRequiredRole("admin", ["admin", "agent"])).toBe(true);
  });

  it("returns false for missing role", () => {
    expect(hasRequiredRole("user", ["admin", "agent"])).toBe(false);
  });

  it("handles null role safely", () => {
    expect(hasRequiredRole(null, ["admin", "agent", "user"])).toBe(false);
  });
});
