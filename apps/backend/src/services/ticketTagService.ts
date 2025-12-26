import { PrismaClient } from "@prisma/client";
import createError from "http-errors";

const prisma = new PrismaClient();

export interface CreateTicketTagPayload {
  name: string;
  color?: string;
  description?: string;
  active?: boolean;
}

export interface UpdateTicketTagPayload {
  name?: string;
  color?: string;
  description?: string;
  active?: boolean;
}

export async function listTicketTags(activeOnly = false) {
  return prisma.ticketTag.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      _count: {
        select: { tickets: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTicketTag(id: string) {
  const tag = await prisma.ticketTag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tickets: true },
      },
    },
  });

  if (!tag) {
    throw createError(404, "Ticket tag not found");
  }

  return tag;
}

export async function createTicketTag(payload: CreateTicketTagPayload) {
  return prisma.ticketTag.create({
    data: {
      name: payload.name,
      color: payload.color,
      description: payload.description,
      active: payload.active ?? true,
    },
  });
}

export async function updateTicketTag(
  id: string,
  payload: UpdateTicketTagPayload,
) {
  return prisma.ticketTag.update({
    where: { id },
    data: payload,
  });
}

export async function deleteTicketTag(id: string) {
  return prisma.ticketTag.delete({
    where: { id },
  });
}

export async function addTagToTicket(ticketId: string, tagId: string) {
  return prisma.ticketTagRelation.create({
    data: {
      ticketId,
      tagId,
    },
  });
}

export async function removeTagFromTicket(ticketId: string, tagId: string) {
  return prisma.ticketTagRelation.delete({
    where: {
      ticketId_tagId: {
        ticketId,
        tagId,
      },
    },
  });
}

export async function getTicketTags(ticketId: string) {
  return prisma.ticketTagRelation.findMany({
    where: { ticketId },
    include: {
      tag: true,
    },
  });
}
