import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Role } from "@prisma/client";
import { createUser, deleteUser, updateUser } from "./userService.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";

vi.mock("../lib/prisma.js", () => {
  return {
    prisma: {
      user: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

vi.mock("../utils/password.js", () => {
  return {
    hashPassword: vi.fn().mockResolvedValue("mock-hash"),
  };
});

const prismaCreate = prisma.user.create as unknown as Mock;
const prismaUpdate = prisma.user.update as unknown as Mock;
const prismaDelete = prisma.user.delete as unknown as Mock;
const hashPasswordMock = hashPassword as unknown as Mock;

beforeEach(() => {
  prismaCreate.mockReset();
  prismaUpdate.mockReset();
  prismaDelete.mockReset();
  hashPasswordMock.mockClear();
});

describe("createUser", () => {
  it("hashes the password and stores a safe user object", async () => {
    prismaCreate.mockResolvedValue({
      id: "user-1",
      name: "Demo",
      email: "demo@example.com",
      role: Role.user,
    });

    const result = await createUser({
      name: "Demo",
      email: "demo@example.com",
      password: "Password123!",
    });

    expect(hashPasswordMock).toHaveBeenCalledWith("Password123!");
    expect(prismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ passwordHash: "mock-hash" }),
      select: expect.any(Object),
    });
    expect(result).toStrictEqual({
      id: "user-1",
      name: "Demo",
      email: "demo@example.com",
      role: Role.user,
    });
  });

  it("throws 409 when email already exists", async () => {
    const conflictError = Object.assign(new Error("conflict"), {
      code: "P2002",
    });
    prismaCreate.mockRejectedValue(conflictError);

    await expect(
      createUser({
        name: "Demo",
        email: "demo@example.com",
        password: "Password123!",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("updateUser", () => {
  it("hashes password when provided and updates selectable fields", async () => {
    prismaUpdate.mockResolvedValue({
      id: "user-1",
      name: "Updated",
      email: "demo@example.com",
      role: Role.admin,
    });

    const result = await updateUser("user-1", {
      name: "Updated",
      password: "StrongerPass123!",
      role: Role.admin,
    });

    expect(hashPasswordMock).toHaveBeenCalledWith("StrongerPass123!");
    expect(prismaUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        name: "Updated",
        role: Role.admin,
        passwordHash: "mock-hash",
      }),
      select: expect.any(Object),
    });
    expect(result).toStrictEqual({
      id: "user-1",
      name: "Updated",
      email: "demo@example.com",
      role: Role.admin,
    });
  });

  it("throws 400 when no fields provided", async () => {
    await expect(updateUser("user-1", {})).rejects.toMatchObject({
      status: 400,
    });
    expect(prismaUpdate).not.toHaveBeenCalled();
  });

  it("translates unique constraint violations", async () => {
    const conflict = Object.assign(new Error("conflict"), { code: "P2002" });
    prismaUpdate.mockRejectedValue(conflict);

    await expect(
      updateUser("user-1", { email: "dupe@example.com" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("deleteUser", () => {
  it("returns the sanitized user on delete", async () => {
    prismaDelete.mockResolvedValue({
      id: "user-2",
      name: "To Remove",
      email: "remove@example.com",
      role: Role.agent,
    });

    const result = await deleteUser("user-2");

    expect(prismaDelete).toHaveBeenCalledWith({
      where: { id: "user-2" },
      select: expect.any(Object),
    });
    expect(result).toStrictEqual({
      id: "user-2",
      name: "To Remove",
      email: "remove@example.com",
      role: Role.agent,
    });
  });

  it("throws 409 when relational constraint prevents deletion", async () => {
    const fkError = Object.assign(new Error("fk"), { code: "P2003" });
    prismaDelete.mockRejectedValue(fkError);

    await expect(deleteUser("user-3")).rejects.toMatchObject({ status: 409 });
  });
});
