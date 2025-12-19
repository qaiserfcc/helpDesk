import createError from "http-errors";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type CategoryWithRelations = Prisma.TicketCategoryGetPayload<{
  include: { subcategories: true };
}>;

export type CategoryListItem = Prisma.TicketCategoryGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    active: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export type SubcategoryWithRelations = Prisma.TicketSubcategoryGetPayload<{
  include: { category: true };
}>;

type CreateCategoryInput = {
  name: string;
  description?: string;
  active?: boolean;
};

type UpdateCategoryInput = {
  name?: string;
  description?: string;
  active?: boolean;
};

type CreateSubcategoryInput = {
  name: string;
  description?: string;
  categoryId: string;
  active?: boolean;
};

type UpdateSubcategoryInput = {
  name?: string;
  description?: string;
  active?: boolean;
};

export async function listCategories(
  activeOnly = false,
): Promise<CategoryListItem[]> {
  const categories = await prisma.ticketCategory.findMany({
    where: activeOnly ? { active: true } : undefined,
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });

  return categories;
}

export async function getCategory(
  categoryId: string,
): Promise<CategoryWithRelations> {
  const category = await prisma.ticketCategory.findUnique({
    where: { id: categoryId },
    include: {
      subcategories: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!category) {
    throw createError(404, "Category not found");
  }

  return category;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<CategoryWithRelations> {
  // Check for duplicate name
  const existing = await prisma.ticketCategory.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw createError(409, "Category with this name already exists");
  }

  const category = await prisma.ticketCategory.create({
    data: {
      name: input.name,
      description: input.description,
      active: input.active ?? true,
    },
    include: {
      subcategories: true,
    },
  });

  return category;
}

export async function updateCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<CategoryWithRelations> {
  // Check if category exists
  const existing = await prisma.ticketCategory.findUnique({
    where: { id: categoryId },
  });

  if (!existing) {
    throw createError(404, "Category not found");
  }

  // If updating name, check for duplicates
  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.ticketCategory.findUnique({
      where: { name: input.name },
    });

    if (duplicate) {
      throw createError(409, "Category with this name already exists");
    }
  }

  const category = await prisma.ticketCategory.update({
    where: { id: categoryId },
    data: {
      name: input.name,
      description: input.description,
      active: input.active,
    },
    include: {
      subcategories: true,
    },
  });

  return category;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  // Check if category exists
  const category = await prisma.ticketCategory.findUnique({
    where: { id: categoryId },
    include: {
      tickets: { select: { id: true } },
      workflows: { select: { id: true } },
    },
  });

  if (!category) {
    throw createError(404, "Category not found");
  }

  // Check if category is in use
  if (category.tickets.length > 0) {
    throw createError(
      400,
      "Cannot delete category that is assigned to tickets. Set it to inactive instead.",
    );
  }

  if (category.workflows.length > 0) {
    throw createError(
      400,
      "Cannot delete category that has workflows. Set it to inactive instead.",
    );
  }

  await prisma.ticketCategory.delete({
    where: { id: categoryId },
  });
}

// Subcategory operations
export async function listSubcategories(
  categoryId?: string,
  activeOnly = false,
): Promise<SubcategoryWithRelations[]> {
  const subcategories = await prisma.ticketSubcategory.findMany({
    where: {
      categoryId: categoryId,
      active: activeOnly ? true : undefined,
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });

  return subcategories;
}

export async function getSubcategory(
  subcategoryId: string,
): Promise<SubcategoryWithRelations> {
  const subcategory = await prisma.ticketSubcategory.findUnique({
    where: { id: subcategoryId },
    include: {
      category: true,
    },
  });

  if (!subcategory) {
    throw createError(404, "Subcategory not found");
  }

  return subcategory;
}

export async function createSubcategory(
  input: CreateSubcategoryInput,
): Promise<SubcategoryWithRelations> {
  // Verify category exists
  const category = await prisma.ticketCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw createError(404, "Category not found");
  }

  // Check for duplicate name within category
  const existing = await prisma.ticketSubcategory.findUnique({
    where: {
      categoryId_name: {
        categoryId: input.categoryId,
        name: input.name,
      },
    },
  });

  if (existing) {
    throw createError(
      409,
      "Subcategory with this name already exists in this category",
    );
  }

  const subcategory = await prisma.ticketSubcategory.create({
    data: {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      active: input.active ?? true,
    },
    include: {
      category: true,
    },
  });

  return subcategory;
}

export async function updateSubcategory(
  subcategoryId: string,
  input: UpdateSubcategoryInput,
): Promise<SubcategoryWithRelations> {
  // Check if subcategory exists
  const existing = await prisma.ticketSubcategory.findUnique({
    where: { id: subcategoryId },
  });

  if (!existing) {
    throw createError(404, "Subcategory not found");
  }

  // If updating name, check for duplicates within the same category
  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.ticketSubcategory.findUnique({
      where: {
        categoryId_name: {
          categoryId: existing.categoryId,
          name: input.name,
        },
      },
    });

    if (duplicate) {
      throw createError(
        409,
        "Subcategory with this name already exists in this category",
      );
    }
  }

  const subcategory = await prisma.ticketSubcategory.update({
    where: { id: subcategoryId },
    data: {
      name: input.name,
      description: input.description,
      active: input.active,
    },
    include: {
      category: true,
    },
  });

  return subcategory;
}

export async function deleteSubcategory(subcategoryId: string): Promise<void> {
  // Check if subcategory exists
  const subcategory = await prisma.ticketSubcategory.findUnique({
    where: { id: subcategoryId },
    include: {
      tickets: { select: { id: true } },
    },
  });

  if (!subcategory) {
    throw createError(404, "Subcategory not found");
  }

  // Check if subcategory is in use
  if (subcategory.tickets.length > 0) {
    throw createError(
      400,
      "Cannot delete subcategory that is assigned to tickets. Set it to inactive instead.",
    );
  }

  await prisma.ticketSubcategory.delete({
    where: { id: subcategoryId },
  });
}
