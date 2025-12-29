import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

type RequestUser = Express.AuthenticatedUser;

export type SubcategoryInput = {
  categoryId: string;
  name: string;
  description?: string;
  active?: boolean;
};

export async function listSubcategoriesByCategory(
  categoryId: string,
  user: RequestUser,
) {
  // Allow all authenticated users to view subcategories for ticket creation
  return prisma.subcategory.findMany({
    where: { categoryId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function getSubcategory(subcategoryId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can view subcategories");
  }
  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
  });
  if (!subcategory) {
    throw createError(404, "Subcategory not found");
  }
  return subcategory;
}

export async function createSubcategory(
  input: SubcategoryInput,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can create subcategories");
  }

  if (!input.categoryId?.trim()) {
    throw createError(400, "Category ID is required");
  }

  if (!input.name?.trim()) {
    throw createError(400, "Subcategory name is required");
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw createError(404, "Parent category not found");
  }

  try {
    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId: input.categoryId,
        name: input.name.trim(),
        description: input.description?.trim(),
        active: input.active ?? true,
      },
    });
    return subcategory;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "Subcategory name must be unique within category");
    }
    throw err;
  }
}

export async function updateSubcategory(
  subcategoryId: string,
  updates: Partial<Omit<SubcategoryInput, "categoryId">>,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can update subcategories");
  }

  const existing = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
  });
  if (!existing) {
    throw createError(404, "Subcategory not found");
  }

  try {
    const subcategory = await prisma.subcategory.update({
      where: { id: subcategoryId },
      data: {
        name: updates.name?.trim() ?? existing.name,
        description: updates.description?.trim() ?? existing.description,
        active: updates.active ?? existing.active,
      },
    });
    return subcategory;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "Subcategory name must be unique within category");
    }
    throw err;
  }
}

export async function deleteSubcategory(
  subcategoryId: string,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can delete subcategories");
  }

  const existing = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
  });
  if (!existing) {
    throw createError(404, "Subcategory not found");
  }

  await prisma.subcategory.delete({ where: { id: subcategoryId } });
  return existing;
}
