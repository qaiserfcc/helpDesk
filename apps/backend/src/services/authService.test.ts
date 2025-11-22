import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Role } from "@prisma/client";
import { login, refreshSession, registerUser } from "./authService.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";
import { createTokenPair, verifyAccessToken } from "../utils/token.js";
import { createUser } from "./userService.js";

vi.mock("../lib/prisma.js", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("./userService.js", () => {
  return {
    createUser: vi.fn(),
  };
});

const prismaFindUnique = prisma.user.findUnique as unknown as Mock;
const createUserMock = createUser as unknown as Mock;

const baseUser = {
  id: "user-001",
  name: "Demo User",
  email: "demo@example.com",
  role: Role.user,
};

beforeEach(() => {
  prismaFindUnique.mockReset();
  createUserMock.mockReset();
});

describe("login", () => {
  it("returns user details and tokens for valid credentials", async () => {
    const passwordHash = await hashPassword("ValidPass123!");
    prismaFindUnique.mockResolvedValue({ ...baseUser, passwordHash });

    const result = await login({
      email: baseUser.email,
      password: "ValidPass123!",
    });

    expect(result.user).toStrictEqual(baseUser);
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it("throws when credentials do not match", async () => {
    const passwordHash = await hashPassword("SomeOtherPass456!");
    prismaFindUnique.mockResolvedValue({ ...baseUser, passwordHash });

    await expect(
      login({ email: baseUser.email, password: "WrongPass789!" }),
    ).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("refreshSession", () => {
  it("issues a new token pair for a valid refresh token", async () => {
    prismaFindUnique.mockResolvedValue(baseUser);
    const { refreshToken } = createTokenPair({
      id: baseUser.id,
      role: baseUser.role,
    });

    const result = await refreshSession(refreshToken);

    expect(result.user).toStrictEqual(baseUser);
    const accessPayload = verifyAccessToken(result.tokens.accessToken);
    expect(accessPayload.sub).toBe(baseUser.id);
  });

  it("rejects invalid refresh tokens", async () => {
    await expect(refreshSession("not-a-real-token")).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("registerUser", () => {
  it("creates a user and returns session tokens", async () => {
    createUserMock.mockResolvedValue(baseUser);

    const result = await registerUser({
      name: baseUser.name,
      email: baseUser.email,
      password: "ValidPass123!",
    });

    expect(createUserMock).toHaveBeenCalledWith({
      name: baseUser.name,
      email: baseUser.email,
      password: "ValidPass123!",
    });
    expect(result.user).toStrictEqual(baseUser);
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });
});
