import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

type RequestUser = Express.AuthenticatedUser;

export type CategoryInput = {
  name: string;
  description?: string;
  active?: boolean;
};

export async function listCategories(user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list categories");
  }
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { subcategories: { where: { active: true } } },
  });
}

export async function listAllCategories(user: RequestUser) {
  // Allow all authenticated users to view categories for ticket creation
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { subcategories: { where: { active: true } } },
  });
}

export async function getCategory(categoryId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can view categories");
  }
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { subcategories: true },
  });
  if (!category) {
    throw createError(404, "Category not found");
  }
  return category;
}

export async function createCategory(input: CategoryInput, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can create categories");
  }

  if (!input.name?.trim()) {
    throw createError(400, "Category name is required");
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim(),
        active: input.active ?? true,
      },
      include: { subcategories: true },
    });
    return category;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "Category name must be unique");
    }
    throw err;
  }
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<CategoryInput>,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can update categories");
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!existing) {
    throw createError(404, "Category not found");
  }

  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: updates.name?.trim() ?? existing.name,
        description: updates.description?.trim() ?? existing.description,
        active: updates.active ?? existing.active,
      },
      include: { subcategories: true },
    });
    return category;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "Category name must be unique");
    }
    throw err;
  }
}

export async function deleteCategory(categoryId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can delete categories");
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!existing) {
    throw createError(404, "Category not found");
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return existing;
}
