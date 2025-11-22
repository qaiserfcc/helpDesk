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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002")
    ) {
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
