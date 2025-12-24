import { PrismaClient, TicketPriority, IssueType } from "@prisma/client";
import createError from "http-errors";

const prisma = new PrismaClient();

export interface CreateTicketTemplatePayload {
  name: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  priority?: TicketPriority;
  issueType?: IssueType;
  defaultDescription?: string;
  attributeDefaults?: Record<string, unknown>;
  createdBy: string;
  active?: boolean;
}

export interface UpdateTicketTemplatePayload {
  name?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  priority?: TicketPriority;
  issueType?: IssueType;
  defaultDescription?: string;
  attributeDefaults?: Record<string, unknown>;
  active?: boolean;
}

export async function listTicketTemplates(activeOnly = false) {
  return prisma.ticketTemplate.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      category: true,
      subcategory: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTicketTemplate(id: string) {
  const template = await prisma.ticketTemplate.findUnique({
    where: { id },
    include: {
      category: true,
      subcategory: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!template) {
    throw createError(404, "Ticket template not found");
  }

  return template;
}

export async function createTicketTemplate(
  payload: CreateTicketTemplatePayload,
) {
  return prisma.ticketTemplate.create({
    data: {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId,
      subcategoryId: payload.subcategoryId,
      priority: payload.priority,
      issueType: payload.issueType,
      defaultDescription: payload.defaultDescription,
      attributeDefaults: payload.attributeDefaults ?? {},
      createdBy: payload.createdBy,
      active: payload.active ?? true,
    },
  });
}

export async function updateTicketTemplate(
  id: string,
  payload: UpdateTicketTemplatePayload,
) {
  return prisma.ticketTemplate.update({
    where: { id },
    data: payload,
  });
}

export async function deleteTicketTemplate(id: string) {
  return prisma.ticketTemplate.delete({
    where: { id },
  });
}
