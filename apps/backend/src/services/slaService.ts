import createError from "http-errors";
import { prisma } from "../lib/prisma.js";
import { TicketPriority } from "@prisma/client";

export interface CreateSLAPayload {
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string | null;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  active?: boolean;
}

export interface UpdateSLAPayload {
  name?: string;
  description?: string;
  subcategoryId?: string | null;
  priority?: TicketPriority;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
  active?: boolean;
}

export async function listSLAs(categoryId?: string, activeOnly: boolean = false) {
  const where: any = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (activeOnly) {
    where.active = true;
  }

  return prisma.ticketSLA.findMany({
    where,
    include: {
      category: true,
      subcategory: true,
    },
    orderBy: [{ categoryId: "asc" }, { priority: "asc" }, { name: "asc" }],
  });
}

export async function getSLA(id: string) {
  const sla = await prisma.ticketSLA.findUnique({
    where: { id },
    include: {
      category: true,
      subcategory: true,
    },
  });

  if (!sla) {
    throw createError(404, "SLA not found");
  }

  return sla;
}

export async function createSLA(payload: CreateSLAPayload) {
  // Validate category exists
  const category = await prisma.ticketCategory.findUnique({
    where: { id: payload.categoryId },
  });

  if (!category) {
    throw createError(404, "Category not found");
  }

  // Validate subcategory if provided
  if (payload.subcategoryId) {
    const subcategory = await prisma.ticketSubcategory.findUnique({
      where: { id: payload.subcategoryId },
    });

    if (!subcategory || subcategory.categoryId !== payload.categoryId) {
      throw createError(404, "Subcategory not found or does not belong to the category");
    }
  }

  // Check for duplicate SLA (same category, subcategory, priority)
  const existing = await prisma.ticketSLA.findUnique({
    where: {
      categoryId_subcategoryId_priority: {
        categoryId: payload.categoryId,
        subcategoryId: payload.subcategoryId || null,
        priority: payload.priority,
      },
    },
  });

  if (existing) {
    throw createError(409, "SLA already exists for this category/subcategory/priority combination");
  }

  // Validate times
  if (payload.responseTimeMinutes <= 0 || payload.resolutionTimeMinutes <= 0) {
    throw createError(400, "Response and resolution times must be greater than 0");
  }

  if (payload.responseTimeMinutes >= payload.resolutionTimeMinutes) {
    throw createError(400, "Response time must be less than resolution time");
  }

  const sla = await prisma.ticketSLA.create({
    data: {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      subcategoryId: payload.subcategoryId,
      priority: payload.priority,
      responseTimeMinutes: payload.responseTimeMinutes,
      resolutionTimeMinutes: payload.resolutionTimeMinutes,
      active: payload.active ?? true,
    },
    include: {
      category: true,
      subcategory: true,
    },
  });

  return sla;
}

export async function updateSLA(id: string, payload: UpdateSLAPayload) {
  const sla = await prisma.ticketSLA.findUnique({
    where: { id },
  });

  if (!sla) {
    throw createError(404, "SLA not found");
  }

  // Validate subcategory if being updated
  if (payload.subcategoryId !== undefined) {
    if (payload.subcategoryId) {
      const subcategory = await prisma.ticketSubcategory.findUnique({
        where: { id: payload.subcategoryId },
      });

      if (!subcategory || subcategory.categoryId !== sla.categoryId) {
        throw createError(
          404,
          "Subcategory not found or does not belong to the category"
        );
      }
    }
  }

  // Validate times if being updated
  const responseTime = payload.responseTimeMinutes ?? sla.responseTimeMinutes;
  const resolutionTime = payload.resolutionTimeMinutes ?? sla.resolutionTimeMinutes;

  if (responseTime <= 0 || resolutionTime <= 0) {
    throw createError(400, "Response and resolution times must be greater than 0");
  }

  if (responseTime >= resolutionTime) {
    throw createError(400, "Response time must be less than resolution time");
  }

  const updated = await prisma.ticketSLA.update({
    where: { id },
    data: {
      name: payload.name,
      description: payload.description,
      subcategoryId: payload.subcategoryId,
      priority: payload.priority,
      responseTimeMinutes: responseTime,
      resolutionTimeMinutes: resolutionTime,
      active: payload.active,
    },
    include: {
      category: true,
      subcategory: true,
    },
  });

  return updated;
}

export async function deleteSLA(id: string) {
  const sla = await prisma.ticketSLA.findUnique({
    where: { id },
  });

  if (!sla) {
    throw createError(404, "SLA not found");
  }

  await prisma.ticketSLA.delete({
    where: { id },
  });

  return { id };
}
