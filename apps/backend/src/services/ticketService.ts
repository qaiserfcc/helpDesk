import createError from "http-errors";
import {
  Prisma,
  IssueType,
  TicketPriority,
  TicketStatus,
  Role,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const ticketInclude = {
  creator: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  assignmentRequest: {
    select: { id: true, name: true, email: true },
  },
} as const;

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof ticketInclude;
}>;

export type TicketFilters = {
  status?: TicketStatus;
  issueType?: IssueType;
  assignedToMe?: boolean;
  limit?: number;
};

type RequestUser = Express.AuthenticatedUser;

function buildVisibilityWhere(user: RequestUser): Prisma.TicketWhereInput {
  if (user.role === Role.user) {
    return { createdBy: user.id };
  }
  return {};
}

export async function listTickets(filters: TicketFilters, user: RequestUser) {
  const visibility = buildVisibilityWhere(user);
  const where: Prisma.TicketWhereInput = {
    ...visibility,
    status: filters.status,
    issueType: filters.issueType,
  };

  if (filters.assignedToMe && user.role !== Role.user) {
    where.assignedTo = user.id;
  }

  const take =
    filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;

  return prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: ticketInclude,
  });
}

export async function getTicket(ticketId: string, user: RequestUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketInclude,
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (user.role === Role.user && ticket.createdBy !== user.id) {
    throw createError(403, "You are not allowed to view this ticket");
  }

  return ticket;
}

type CreateTicketInput = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
  attachments?: string[];
};

export async function createTicket(
  input: CreateTicketInput,
  user: RequestUser,
) {
  if (user.role !== Role.user && user.role !== Role.admin) {
    throw createError(403, "Only end-users or admins can create tickets");
  }

  return prisma.ticket.create({
    data: {
      description: input.description,
      priority: input.priority,
      issueType: input.issueType,
      attachments: input.attachments ?? [],
      createdBy: user.id,
    },
    include: ticketInclude,
  });
}

type UpdateTicketInput = Partial<
  Pick<CreateTicketInput, "description" | "priority" | "issueType">
> & {
  status?: TicketStatus;
};

export async function updateTicket(
  ticketId: string,
  updates: UpdateTicketInput,
  user: RequestUser,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  const isAdmin = user.role === Role.admin;
  const isOwner = ticket.createdBy === user.id;

  if (!isAdmin) {
    if (user.role === Role.user) {
      if (!isOwner) {
        throw createError(403, "You cannot modify this ticket");
      }
    } else {
      throw createError(403, "Only admins or the ticket owner may edit");
    }
  }

  if (updates.status && !isAdmin) {
    throw createError(403, "Only admins can change ticket status");
  }

  const nextStatus = updates.status ?? ticket.status;
  const resolvedAt =
    nextStatus === TicketStatus.resolved && ticket.resolvedAt === null
      ? new Date()
      : ticket.resolvedAt;

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      description: updates.description ?? ticket.description,
      priority: updates.priority ?? ticket.priority,
      issueType: updates.issueType ?? ticket.issueType,
      status: nextStatus,
      resolvedAt,
    },
    include: ticketInclude,
  });
}

export async function assignTicket(
  ticketId: string,
  assigneeId: string | undefined,
  user: RequestUser,
) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can assign tickets");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  const targetAssignee = assigneeId ?? ticket.assignmentRequestId;
  if (!targetAssignee) {
    throw createError(400, "Provide an agent id or approve a pending request");
  }

  const assignee = await prisma.user.findUnique({
    where: { id: targetAssignee },
    select: { id: true, role: true },
  });
  if (!assignee) {
    throw createError(404, "Assignee not found");
  }

  if (assignee.role !== Role.agent) {
    throw createError(400, "Assignee must be an agent");
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedTo: assignee.id,
      assignmentRequestId: null,
      status:
        ticket.status === TicketStatus.open
          ? TicketStatus.in_progress
          : ticket.status,
    },
    include: ticketInclude,
  });
}

export async function resolveTicket(ticketId: string, user: RequestUser) {
  if (user.role === Role.user) {
    throw createError(403, "Only agents or admins can resolve tickets");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (ticket.status === TicketStatus.resolved) {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        resolvedAt: ticket.resolvedAt ?? new Date(),
        assignmentRequestId: null,
      },
      include: ticketInclude,
    });
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: TicketStatus.resolved,
      resolvedAt: new Date(),
      assignmentRequestId: null,
    },
    include: ticketInclude,
  });
}

export async function requestAssignment(ticketId: string, user: RequestUser) {
  if (user.role !== Role.agent) {
    throw createError(403, "Only agents can request assignments");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (ticket.status === TicketStatus.resolved) {
    throw createError(400, "Cannot request a resolved ticket");
  }

  if (ticket.assignedTo) {
    throw createError(400, "Ticket already assigned");
  }

  if (
    ticket.assignmentRequestId &&
    ticket.assignmentRequestId !== user.id
  ) {
    throw createError(409, "Ticket already requested by another agent");
  }

  if (ticket.assignmentRequestId === user.id) {
    return prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: ticketInclude,
    });
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { assignmentRequestId: user.id },
    include: ticketInclude,
  });
}

export async function appendAttachments(
  ticketId: string,
  attachmentPaths: string[],
  user: RequestUser,
) {
  if (!attachmentPaths.length) {
    throw createError(400, "No attachments provided");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (user.role === Role.user && ticket.createdBy !== user.id) {
    throw createError(403, "You cannot update attachments for this ticket");
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { attachments: [...ticket.attachments, ...attachmentPaths] },
    include: ticketInclude,
  });
}

type QueuedTicketInput = {
  tempId: string;
  description: string;
  priority?: TicketPriority;
  issueType?: IssueType;
  attachments?: string[];
  createdAt?: string;
};

export async function ingestQueuedTickets(
  tickets: QueuedTicketInput[],
  user: RequestUser,
) {
  if (!tickets.length) {
    return [] as const;
  }

  if (user.role !== Role.user && user.role !== Role.admin) {
    throw createError(403, "Only end-users or admins can sync tickets");
  }

  const results: Array<{ tempId: string; ticket: TicketWithRelations }> = [];

  for (const payload of tickets) {
    if (!payload.tempId || !payload.description) {
      continue;
    }

    const ticket = await prisma.ticket.create({
      data: {
        description: payload.description,
        priority: payload.priority ?? TicketPriority.medium,
        issueType: payload.issueType ?? IssueType.other,
        attachments: payload.attachments ?? [],
        createdBy: user.id,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      },
      include: ticketInclude,
    });

    results.push({ tempId: payload.tempId, ticket });
  }

  return results;
}

export async function getTicketDiff(since: Date, user: RequestUser) {
  const visibility = buildVisibilityWhere(user);
  const where: Prisma.TicketWhereInput = {
    ...visibility,
    updatedAt: { gt: since },
  };

  return prisma.ticket.findMany({
    where,
    orderBy: { updatedAt: "asc" },
    include: ticketInclude,
  });
}
