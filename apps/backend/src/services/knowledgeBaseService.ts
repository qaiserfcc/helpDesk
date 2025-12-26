import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export interface CreateKnowledgeArticlePayload {
  title: string;
  content: string;
  summary?: string;
  categoryId?: string;
  tags?: string[];
  published?: boolean;
  authorId: string;
}

export interface UpdateKnowledgeArticlePayload {
  title?: string;
  content?: string;
  summary?: string;
  categoryId?: string;
  tags?: string[];
  published?: boolean;
}

export async function listKnowledgeArticles(
  published?: boolean,
  categoryId?: string,
  searchTerm?: string,
) {
  const where: any = {};

  if (published !== undefined) {
    where.published = published;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { content: { contains: searchTerm, mode: "insensitive" } },
      { summary: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  return prisma.knowledgeArticle.findMany({
    where,
    include: {
      category: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { published: "desc" },
      { views: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function getKnowledgeArticle(id: string) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!article) {
    throw createError(404, "Knowledge article not found");
  }

  // Increment view count
  await prisma.knowledgeArticle.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  return article;
}

export async function createKnowledgeArticle(
  payload: CreateKnowledgeArticlePayload,
) {
  return prisma.knowledgeArticle.create({
    data: {
      title: payload.title,
      content: payload.content,
      summary: payload.summary,
      categoryId: payload.categoryId,
      tags: payload.tags ?? [],
      published: payload.published ?? false,
      authorId: payload.authorId,
    },
  });
}

export async function updateKnowledgeArticle(
  id: string,
  payload: UpdateKnowledgeArticlePayload,
) {
  return prisma.knowledgeArticle.update({
    where: { id },
    data: payload,
  });
}

export async function deleteKnowledgeArticle(id: string) {
  return prisma.knowledgeArticle.delete({
    where: { id },
  });
}

export async function rateArticle(id: string, helpful: boolean) {
  return prisma.knowledgeArticle.update({
    where: { id },
    data: helpful
      ? { helpful: { increment: 1 } }
      : { notHelpful: { increment: 1 } },
  });
}

export async function searchKnowledgeBase(query: string, limit = 10) {
  return prisma.knowledgeArticle.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
      ],
    },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { views: "desc" },
      { helpful: "desc" },
    ],
    take: limit,
  });
}
