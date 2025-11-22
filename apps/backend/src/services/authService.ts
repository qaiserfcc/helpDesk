import createError from "http-errors";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../utils/password.js";
import {
  createTokenPair,
  verifyRefreshToken,
  type TokenPair,
} from "../utils/token.js";
import { createUser } from "./userService.js";

const loginSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  passwordHash: true,
} as const;

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role?: Role;
};

export type AuthResult = {
  user: AuthUser;
  tokens: TokenPair;
};

function toAuthUser(user: AuthUser): AuthUser {
  return { ...user };
}

export async function login({
  email,
  password,
}: LoginInput): Promise<AuthResult> {
  const userRecord = await prisma.user.findUnique({
    where: { email },
    select: loginSelect,
  });

  if (!userRecord) {
    throw createError(401, "Invalid credentials");
  }

  const passwordMatch = await verifyPassword(password, userRecord.passwordHash);

  if (!passwordMatch) {
    throw createError(401, "Invalid credentials");
  }

  const user: AuthUser = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
  };
  const tokens = createTokenPair({ id: user.id, role: user.role });

  return {
    user: toAuthUser(user),
    tokens,
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const user = await createUser({
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
  });

  const tokens = createTokenPair({ id: user.id, role: user.role });

  return {
    user: toAuthUser(user),
    tokens,
  };
}

export async function refreshSession(
  refreshToken: string,
): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw createError(401, "Invalid refresh token");
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: safeUserSelect,
  });

  if (!userRecord) {
    throw createError(401, "User session is no longer valid");
  }

  const tokens = createTokenPair({ id: userRecord.id, role: userRecord.role });

  return {
    user: toAuthUser(userRecord),
    tokens,
  };
}
