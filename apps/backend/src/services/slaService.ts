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
  // Note: Prisma's unique constraint types don't properly handle nullable fields
  // We need to ensure the value is either a string or null
  const subcatId = payload.subcategoryId === undefined ? null : payload.subcategoryId;
  if (subcatId !== null) {
    const existing = await prisma.ticketSLA.findUnique({
      where: {
        categoryId_subcategoryId_priority: {
          categoryId: payload.categoryId,
          subcategoryId: subcatId,
          priority: payload.priority,
        },
      },
    });
    if (existing) {
      throw createError(
        409,
        "SLA already exists for this category/subcategory/priority combination",
      );
    }
  } else {
    // Check for null subcategory case
    const existing = await prisma.ticketSLA.findFirst({
      where: {
        categoryId: payload.categoryId,
        subcategoryId: null,
        priority: payload.priority,
      },
    });
    if (existing) {
      throw createError(
        409,
        "SLA already exists for this category/subcategory/priority combination",
      );
    }
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

export async function findApplicableSLA(
  categoryId: string | null,
  subcategoryId: string | null,
  priority: TicketPriority,
) {
  if (!categoryId) {
    return null;
  }

  // Try to find SLA with exact category and subcategory match
  if (subcategoryId) {
    const sla = await prisma.ticketSLA.findFirst({
      where: {
        categoryId,
        subcategoryId,
        priority,
        active: true,
      },
    });
    if (sla) return sla;
  }

  // Fall back to category-level SLA
  const sla = await prisma.ticketSLA.findFirst({
    where: {
      categoryId,
      subcategoryId: null,
      priority,
      active: true,
    },
  });

  return sla;
}

export interface SLAStatus {
  slaId: string | null;
  responseTimeDue: Date | null;
  resolutionTimeDue: Date | null;
  responseTimeRemaining: number | null; // minutes
  resolutionTimeRemaining: number | null; // minutes
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  responseTimeUsed: number | null; // minutes
  resolutionTimeUsed: number | null; // minutes
}

export async function calculateTicketSLA(ticketId: string): Promise<SLAStatus> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: true,
      subcategory: true,
    },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  // Find applicable SLA
  const sla = await findApplicableSLA(
    ticket.categoryId,
    ticket.subcategoryId,
    ticket.priority,
  );

  if (!sla) {
    return {
      slaId: null,
      responseTimeDue: null,
      resolutionTimeDue: null,
      responseTimeRemaining: null,
      resolutionTimeRemaining: null,
      isResponseBreached: false,
      isResolutionBreached: false,
      responseTimeUsed: null,
      resolutionTimeUsed: null,
    };
  }

  const now = new Date();
  const createdAt = ticket.createdAt;

  // Calculate due times
  const responseTimeDue = new Date(
    createdAt.getTime() + sla.responseTimeMinutes * 60 * 1000,
  );
  const resolutionTimeDue = new Date(
    createdAt.getTime() + sla.resolutionTimeMinutes * 60 * 1000,
  );

  // Calculate time used
  const responseTimeUsed = ticket.firstResponseAt
    ? (ticket.firstResponseAt.getTime() - createdAt.getTime()) / (60 * 1000)
    : (now.getTime() - createdAt.getTime()) / (60 * 1000);

  const resolutionTimeUsed = ticket.resolvedAt
    ? (ticket.resolvedAt.getTime() - createdAt.getTime()) / (60 * 1000)
    : (now.getTime() - createdAt.getTime()) / (60 * 1000);

  // Calculate remaining time
  const responseTimeRemaining = ticket.firstResponseAt
    ? 0
    : (responseTimeDue.getTime() - now.getTime()) / (60 * 1000);

  const resolutionTimeRemaining = ticket.resolvedAt
    ? 0
    : (resolutionTimeDue.getTime() - now.getTime()) / (60 * 1000);

  // Determine if breached
  const isResponseBreached = ticket.firstResponseAt
    ? responseTimeUsed > sla.responseTimeMinutes
    : responseTimeRemaining < 0;

  const isResolutionBreached = ticket.resolvedAt
    ? resolutionTimeUsed > sla.resolutionTimeMinutes
    : resolutionTimeRemaining < 0;

  return {
    slaId: sla.id,
    responseTimeDue,
    resolutionTimeDue,
    responseTimeRemaining,
    resolutionTimeRemaining,
    isResponseBreached,
    isResolutionBreached,
    responseTimeUsed,
    resolutionTimeUsed,
  };
}

export async function updateTicketSLAStatus(ticketId: string) {
  const slaStatus = await calculateTicketSLA(ticketId);

  // Update ticket with SLA breach flags
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      slaId: slaStatus.slaId,
      slaResponseBreached: slaStatus.isResponseBreached,
      slaResolutionBreached: slaStatus.isResolutionBreached,
    },
  });

  return slaStatus;
}

export async function getTicketsBreachingSLA() {
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [{ slaResponseBreached: true }, { slaResolutionBreached: true }],
      status: { not: "resolved" },
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      subcategory: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return tickets;
}
