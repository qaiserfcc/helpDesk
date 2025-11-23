import createError from "http-errors";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: Role;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
};

function extractPrismaErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: string }).code === "string"
  ) {
    return (error as { code?: string }).code ?? null;
  }
  return null;
}

export async function createUser(input: CreateUserInput) {
  try {
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role ?? Role.user,
        passwordHash,
      },
      select: userSelect,
    });

    return user;
  } catch (error) {
    if (extractPrismaErrorCode(error) === "P2002") {
      throw createError(409, "Email is already in use");
    }
    throw error;
  }
}

export async function getUserProfile(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  if (!user) {
    throw createError(404, "User not found");
  }
  return user;
}

export type ListUsersFilters = {
  role?: Role;
};

export async function listUsers(filters: ListUsersFilters = {}) {
  return prisma.user.findMany({
    where: filters.role ? { role: filters.role } : undefined,
    orderBy: { name: "asc" },
    select: userSelect,
  });
}

export async function updateUser(userId: string, updates: UpdateUserInput) {
  const hasUpdates = Object.values(updates).some(
    (value) => value !== undefined,
  );

  if (!hasUpdates) {
    throw createError(400, "No updates provided");
  }

  const data: Prisma.UserUpdateInput = {};
  if (updates.name !== undefined) {
    data.name = updates.name;
  }
  if (updates.email !== undefined) {
    data.email = updates.email;
  }
  if (updates.role !== undefined) {
    data.role = updates.role;
  }
  if (updates.password !== undefined) {
    data.passwordHash = await hashPassword(updates.password);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
    return user;
  } catch (error) {
    const code = extractPrismaErrorCode(error);
    if (code === "P2002") {
      throw createError(409, "Email is already in use");
    }
    if (code === "P2025") {
      throw createError(404, "User not found");
    }
    throw error;
  }
}

export async function deleteUser(userId: string) {
  try {
    const user = await prisma.user.delete({
      where: { id: userId },
      select: userSelect,
    });
    return user;
  } catch (error) {
    const code = extractPrismaErrorCode(error);
    if (code === "P2025") {
      throw createError(404, "User not found");
    }
    if (code === "P2003") {
      throw createError(409, "User has related records and cannot be deleted");
    }
    throw error;
  }
}
