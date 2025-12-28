import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

type RequestUser = Express.AuthenticatedUser;

export type CommentInput = {
  content: string;
  parentId?: string;
};

const commentInclude = {
  author: {
    select: { id: true, name: true, email: true, role: true },
  },
  replies: {
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export async function createComment(
  ticketId: string,
  input: CommentInput,
  user: RequestUser,
) {
  if (!input.content?.trim()) {
    throw createError(400, "Comment content is required");
  }

  // Verify ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdBy: true, assignedTo: true },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  // Check if user has access to this ticket
  const isCreator = ticket.createdBy === user.id;
  const isAssignee = ticket.assignedTo === user.id;
  const isAdmin = user.role === "admin";

  if (!isCreator && !isAssignee && !isAdmin) {
    throw createError(403, "You don't have access to comment on this ticket");
  }

  // If this is a reply, verify parent comment exists
  if (input.parentId) {
    const parent = await prisma.ticketComment.findFirst({
      where: {
        id: input.parentId,
        ticketId,
      },
    });

    if (!parent) {
      throw createError(404, "Parent comment not found");
    }
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: user.id,
      content: input.content.trim(),
      parentId: input.parentId,
    },
    include: commentInclude,
  });

  // Log activity
  const activityType = input.parentId ? "reply" : "comment";
  await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: activityType,
      commentId: comment.id,
      comment: input.content.trim(),
    },
  });

  return comment;
}

export async function listComments(ticketId: string, user: RequestUser) {
  // Verify ticket exists and user has access
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdBy: true, assignedTo: true },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  const isCreator = ticket.createdBy === user.id;
  const isAssignee = ticket.assignedTo === user.id;
  const isAdmin = user.role === "admin";

  if (!isCreator && !isAssignee && !isAdmin) {
    throw createError(403, "You don't have access to view comments on this ticket");
  }

  // Get top-level comments (no parent) with their replies
  const comments = await prisma.ticketComment.findMany({
    where: {
      ticketId,
      parentId: null,
    },
    include: commentInclude,
    orderBy: { createdAt: "desc" },
  });

  return comments;
}

export async function updateComment(
  commentId: string,
  content: string,
  user: RequestUser,
) {
  if (!content?.trim()) {
    throw createError(400, "Comment content is required");
  }

  const comment = await prisma.ticketComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, ticketId: true },
  });

  if (!comment) {
    throw createError(404, "Comment not found");
  }

  // Only the author or admin can update a comment
  if (comment.authorId !== user.id && user.role !== "admin") {
    throw createError(403, "You can only update your own comments");
  }

  const updated = await prisma.ticketComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    include: commentInclude,
  });

  return updated;
}

export async function deleteComment(commentId: string, user: RequestUser) {
  const comment = await prisma.ticketComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, ticketId: true },
  });

  if (!comment) {
    throw createError(404, "Comment not found");
  }

  // Only the author or admin can delete a comment
  if (comment.authorId !== user.id && user.role !== "admin") {
    throw createError(403, "You can only delete your own comments");
  }

  await prisma.ticketComment.delete({
    where: { id: commentId },
  });

  return { id: commentId };
}
