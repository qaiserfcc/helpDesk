import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Role } from "@prisma/client";
import { createUser } from "./userService.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";

vi.mock("../lib/prisma.js", () => {
  return {
    prisma: {
      user: {
        create: vi.fn(),
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
const hashPasswordMock = hashPassword as unknown as Mock;

beforeEach(() => {
  prismaCreate.mockReset();
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
