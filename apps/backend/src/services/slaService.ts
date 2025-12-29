import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

type RequestUser = Express.AuthenticatedUser;

export type SlaInput = {
  name: string;
  subcategoryId: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  priority: "low" | "medium" | "high";
  description?: string;
  active?: boolean;
};

export async function listSlas(user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list SLAs");
  }
  return prisma.sla.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { subcategory: true },
  });
}

export async function listSlasBySubcategory(
  subcategoryId: string,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list SLAs");
  }
  return prisma.sla.findMany({
    where: { subcategoryId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function getSla(slaId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can view SLAs");
  }
  const sla = await prisma.sla.findUnique({
    where: { id: slaId },
    include: { subcategory: true },
  });
  if (!sla) {
    throw createError(404, "SLA not found");
  }
  return sla;
}

export async function createSla(input: SlaInput, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can create SLAs");
  }

  if (!input.name?.trim()) {
    throw createError(400, "SLA name is required");
  }

  if (!input.subcategoryId?.trim()) {
    throw createError(400, "Subcategory ID is required");
  }

  if (
    typeof input.responseTimeHours !== "number" ||
    input.responseTimeHours <= 0
  ) {
    throw createError(400, "Response time must be a positive number");
  }

  if (
    typeof input.resolutionTimeHours !== "number" ||
    input.resolutionTimeHours <= 0
  ) {
    throw createError(400, "Resolution time must be a positive number");
  }

  const subcategory = await prisma.subcategory.findUnique({
    where: { id: input.subcategoryId },
  });
  if (!subcategory) {
    throw createError(404, "Subcategory not found");
  }

  try {
    const sla = await prisma.sla.create({
      data: {
        name: input.name.trim(),
        subcategoryId: input.subcategoryId,
        responseTimeHours: input.responseTimeHours,
        resolutionTimeHours: input.resolutionTimeHours,
        priority: input.priority,
        description: input.description?.trim(),
        active: input.active ?? true,
      },
      include: { subcategory: true },
    });
    return sla;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "SLA name must be unique");
    }
    throw err;
  }
}

export async function updateSla(
  slaId: string,
  updates: Partial<Omit<SlaInput, "subcategoryId">>,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can update SLAs");
  }

  const existing = await prisma.sla.findUnique({
    where: { id: slaId },
  });
  if (!existing) {
    throw createError(404, "SLA not found");
  }

  try {
    const sla = await prisma.sla.update({
      where: { id: slaId },
      data: {
        name: updates.name?.trim() ?? existing.name,
        responseTimeHours:
          updates.responseTimeHours ?? existing.responseTimeHours,
        resolutionTimeHours:
          updates.resolutionTimeHours ?? existing.resolutionTimeHours,
        priority: updates.priority ?? existing.priority,
        description: updates.description?.trim() ?? existing.description,
        active: updates.active ?? existing.active,
      },
      include: { subcategory: true },
    });
    return sla;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "SLA name must be unique");
    }
    throw err;
  }
}

export async function deleteSla(slaId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can delete SLAs");
  }

  const existing = await prisma.sla.findUnique({
    where: { id: slaId },
  });
  if (!existing) {
    throw createError(404, "SLA not found");
  }

  await prisma.sla.delete({ where: { id: slaId } });
  return existing;
}
