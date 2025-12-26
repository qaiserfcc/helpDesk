import { TicketPriority, IssueType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

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
  priority?: TicketPriority;
  issueType?: IssueType;
  defaultDescription?: string;
  attributeDefaults?: unknown;
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
  const createData: any = {
    name: payload.name,
    createdBy: payload.createdBy,
    active: payload.active ?? true,
  };
  
  if (payload.description !== undefined) createData.description = payload.description;
  if (payload.categoryId !== undefined) createData.categoryId = payload.categoryId;
  if (payload.subcategoryId !== undefined) createData.subcategoryId = payload.subcategoryId;
  if (payload.priority !== undefined) createData.priority = payload.priority;
  if (payload.issueType !== undefined) createData.issueType = payload.issueType;
  if (payload.defaultDescription !== undefined) createData.defaultDescription = payload.defaultDescription;
  if (payload.attributeDefaults !== undefined) {
    createData.attributeDefaults = payload.attributeDefaults;
  }
  
  return prisma.ticketTemplate.create({
    data: createData,
  });
}

export async function updateTicketTemplate(
  id: string,
  payload: UpdateTicketTemplatePayload,
) {
  const updateData: any = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.priority !== undefined) updateData.priority = payload.priority;
  if (payload.issueType !== undefined) updateData.issueType = payload.issueType;
  if (payload.defaultDescription !== undefined) updateData.defaultDescription = payload.defaultDescription;
  if (payload.attributeDefaults !== undefined) updateData.attributeDefaults = payload.attributeDefaults;
  if (payload.active !== undefined) updateData.active = payload.active;
  
  return prisma.ticketTemplate.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteTicketTemplate(id: string) {
  return prisma.ticketTemplate.delete({
    where: { id },
  });
}
