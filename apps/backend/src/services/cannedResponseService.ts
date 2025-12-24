import { PrismaClient } from "@prisma/client";
import createError from "http-errors";

const prisma = new PrismaClient();

export interface CreateCannedResponsePayload {
  title: string;
  shortcut: string;
  content: string;
  categoryId?: string;
  createdBy: string;
  active?: boolean;
}

export interface UpdateCannedResponsePayload {
  title?: string;
  shortcut?: string;
  content?: string;
  categoryId?: string;
  active?: boolean;
}

export async function listCannedResponses(
  activeOnly = false,
  categoryId?: string,
) {
  const where: any = {};

  if (activeOnly) {
    where.active = true;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  return prisma.cannedResponse.findMany({
    where,
    include: {
      category: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });
}

export async function getCannedResponse(id: string) {
  const response = await prisma.cannedResponse.findUnique({
    where: { id },
    include: {
      category: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!response) {
    throw createError(404, "Canned response not found");
  }

  return response;
}

export async function getCannedResponseByShortcut(shortcut: string) {
  const response = await prisma.cannedResponse.findUnique({
    where: { shortcut },
    include: {
      category: true,
    },
  });

  if (!response) {
    throw createError(404, "Canned response not found");
  }

  return response;
}

export async function createCannedResponse(
  payload: CreateCannedResponsePayload,
) {
  return prisma.cannedResponse.create({
    data: {
      title: payload.title,
      shortcut: payload.shortcut,
      content: payload.content,
      categoryId: payload.categoryId,
      createdBy: payload.createdBy,
      active: payload.active ?? true,
    },
  });
}

export async function updateCannedResponse(
  id: string,
  payload: UpdateCannedResponsePayload,
) {
  return prisma.cannedResponse.update({
    where: { id },
    data: payload,
  });
}

export async function deleteCannedResponse(id: string) {
  return prisma.cannedResponse.delete({
    where: { id },
  });
}

export async function searchCannedResponses(query: string) {
  return prisma.cannedResponse.findMany({
    where: {
      active: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { shortcut: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      category: true,
    },
    orderBy: { title: "asc" },
  });
}
