import createError from "http-errors";
import {
  Prisma,
  IssueType,
  TicketPriority,
  TicketStatus,
  Role,
  TicketActivityType,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { publishTicketEvent } from "../realtime/ticketPublisher.js";
import { dispatchTicketEmail } from "../notifications/ticketMailer.js";

const ticketInclude = {
  creator: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  assignmentRequest: {
    select: { id: true, name: true, email: true },
  },
} as const;

const ticketActivityInclude = {
  actor: { select: { id: true, name: true, email: true, role: true } },
  fromAssignee: {
    select: { id: true, name: true, email: true },
  },
  toAssignee: {
    select: { id: true, name: true, email: true },
  },
} as const;

const ticketCoreSelect = {
  id: true,
  status: true,
  description: true,
  priority: true,
  issueType: true,
  attachments: true,
  createdBy: true,
  assignedTo: true,
  assignmentRequestId: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type TicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof ticketInclude;
}>;

export type TicketActivityEntry = Prisma.TicketActivityGetPayload<{
  include: typeof ticketActivityInclude;
}>;

type ActivityLogInput = {
  ticketId: string;
  actorId: string;
  type: TicketActivityType;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  fromAssigneeId?: string | null;
  toAssigneeId?: string | null;
};

async function logTicketActivity(input: ActivityLogInput) {
  const activity = await prisma.ticketActivity.create({
    data: {
      ticketId: input.ticketId,
      actorId: input.actorId,
      type: input.type,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      fromAssigneeId: input.fromAssigneeId ?? null,
      toAssigneeId: input.toAssigneeId ?? null,
    },
    include: ticketActivityInclude,
  });

  const audience = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    select: { id: true, createdBy: true, assignedTo: true },
  });

  publishTicketEvent({
    type: "tickets:activity",
    ticketId: input.ticketId,
    activity,
    audience,
  });
}

function notifyTicketChange(
  ticket: TicketWithRelations,
  type: "tickets:created" | "tickets:updated" = "tickets:updated",
) {
  publishTicketEvent({ type, ticket });
  void dispatchTicketEmail(ticket, type);
}

function extractAggregateCount(
  aggregate: { _all?: number } | true | null | undefined,
) {
  if (!aggregate || aggregate === true) {
    return 0;
  }
  return aggregate._all ?? 0;
}

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

  const ticket = await prisma.ticket.create({
    data: {
      description: input.description,
      priority: input.priority,
      issueType: input.issueType,
      attachments: input.attachments ?? [],
      createdBy: user.id,
    },
    include: ticketInclude,
  });

  notifyTicketChange(ticket, "tickets:created");
  return ticket;
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
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketCoreSelect,
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (user.role === Role.user && ticket.status === TicketStatus.resolved) {
    throw createError(403, "Resolved tickets cannot be edited");
  }

  const isAdmin = user.role === Role.admin;
  const isOwner = ticket.createdBy === user.id;
  const isAssignedAgent =
    user.role === Role.agent && ticket.assignedTo === user.id;
  const isAgent = user.role === Role.agent;

  if (isAgent) {
    const { status, ...otherUpdates } = updates;
    const hasOtherChanges = Object.values(otherUpdates).some(
      (value) => value !== undefined,
    );

    if (hasOtherChanges) {
      throw createError(403, "Agents may only change ticket status");
    }

    if (!status) {
      throw createError(400, "Status update is required");
    }
  } else if (!isAdmin) {
    if (user.role === Role.user) {
      if (!isOwner) {
        throw createError(403, "You cannot modify this ticket");
      }
    } else {
      throw createError(403, "Only admins or the ticket owner may edit");
    }
  }

  if (updates.status && !(isAssignedAgent || isAdmin)) {
    throw createError(
      403,
      "Only the assigned agent or an admin can change ticket status",
    );
  }

  const nextStatus = updates.status ?? ticket.status;
  const statusChanged = nextStatus !== ticket.status;
  const descriptionChanged =
    updates.description !== undefined && updates.description !== ticket.description;
  const priorityChanged =
    updates.priority !== undefined && updates.priority !== ticket.priority;
  const issueTypeChanged =
    updates.issueType !== undefined && updates.issueType !== ticket.issueType;
  const detailFieldsChanged =
    descriptionChanged || priorityChanged || issueTypeChanged;
  let resolvedAt = ticket.resolvedAt;
  if (nextStatus === TicketStatus.resolved) {
    resolvedAt = ticket.resolvedAt ?? new Date();
  } else if (ticket.status === TicketStatus.resolved) {
    resolvedAt = null;
  }

  const updatedTicket = await prisma.ticket.update({
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

  notifyTicketChange(updatedTicket);

  if (statusChanged) {
    await logTicketActivity({
      ticketId,
      actorId: user.id,
      type: TicketActivityType.status_change,
      fromStatus: ticket.status,
      toStatus: nextStatus,
      fromAssigneeId: ticket.assignedTo,
      toAssigneeId: ticket.assignedTo,
    });
  } else if (user.role === Role.user && detailFieldsChanged) {
    await logTicketActivity({
      ticketId,
      actorId: user.id,
      type: "ticket_update" as TicketActivityType,
      fromStatus: ticket.status,
      toStatus: nextStatus,
      fromAssigneeId: ticket.assignedTo,
      toAssigneeId: ticket.assignedTo,
    });
  }

  return updatedTicket;
}

export async function assignTicket(
  ticketId: string,
  assigneeId: string | undefined,
  user: RequestUser,
) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can assign tickets");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketCoreSelect,
  });
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

  const nextStatus =
    ticket.status === TicketStatus.open
      ? TicketStatus.in_progress
      : ticket.status;
  const statusChanged = nextStatus !== ticket.status;
  const assignmentChanged = ticket.assignedTo !== assignee.id;

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedTo: assignee.id,
      assignmentRequestId: null,
      status: nextStatus,
    },
    include: ticketInclude,
  });

  notifyTicketChange(updatedTicket);

  if (assignmentChanged) {
    await logTicketActivity({
      ticketId,
      actorId: user.id,
      type: TicketActivityType.assignment_change,
      fromAssigneeId: ticket.assignedTo,
      toAssigneeId: assignee.id,
      fromStatus: ticket.status,
      toStatus: nextStatus,
    });
  } else if (statusChanged) {
    await logTicketActivity({
      ticketId,
      actorId: user.id,
      type: TicketActivityType.status_change,
      fromStatus: ticket.status,
      toStatus: nextStatus,
      fromAssigneeId: ticket.assignedTo,
      toAssigneeId: ticket.assignedTo,
    });
  }

  return updatedTicket;
}

export async function resolveTicket(ticketId: string, user: RequestUser) {
  if (user.role !== Role.agent) {
    throw createError(403, "Only agents can resolve tickets");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketCoreSelect,
  });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (ticket.assignedTo !== user.id) {
    throw createError(403, "Only the assigned agent can resolve this ticket");
  }

  const alreadyResolved = ticket.status === TicketStatus.resolved;
  const data = alreadyResolved
    ? {
        resolvedAt: ticket.resolvedAt ?? new Date(),
        assignmentRequestId: null,
      }
    : {
        status: TicketStatus.resolved,
        resolvedAt: new Date(),
        assignmentRequestId: null,
      };

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: ticketInclude,
  });

  notifyTicketChange(updatedTicket);

  if (!alreadyResolved) {
    await logTicketActivity({
      ticketId,
      actorId: user.id,
      type: TicketActivityType.status_change,
      fromStatus: ticket.status,
      toStatus: TicketStatus.resolved,
      fromAssigneeId: ticket.assignedTo,
      toAssigneeId: ticket.assignedTo,
    });
  }

  return updatedTicket;
}

export async function requestAssignment(ticketId: string, user: RequestUser) {
  if (user.role !== Role.agent) {
    throw createError(403, "Only agents can request assignments");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketCoreSelect,
  });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (ticket.status === TicketStatus.resolved) {
    throw createError(400, "Cannot request a resolved ticket");
  }

  if (ticket.assignedTo) {
    throw createError(400, "Ticket already assigned");
  }

  if (ticket.assignmentRequestId && ticket.assignmentRequestId !== user.id) {
    throw createError(409, "Ticket already requested by another agent");
  }

  if (ticket.assignmentRequestId === user.id) {
    return prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: ticketInclude,
    });
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignmentRequestId: user.id },
    include: ticketInclude,
  });

  notifyTicketChange(updatedTicket);
  await logTicketActivity({
    ticketId,
    actorId: user.id,
    type: "assignment_request" as TicketActivityType,
    fromStatus: ticket.status,
    toStatus: updatedTicket.status,
    fromAssigneeId: ticket.assignedTo,
    toAssigneeId: user.id,
  });
  return updatedTicket;
}

export async function declineAssignmentRequest(
  ticketId: string,
  user: RequestUser,
) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can decline assignment requests");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketCoreSelect,
  });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (!ticket.assignmentRequestId) {
    throw createError(409, "No pending request to decline");
  }

  const requesterId = ticket.assignmentRequestId;

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignmentRequestId: null },
    include: ticketInclude,
  });

  notifyTicketChange(updatedTicket);
  await logTicketActivity({
    ticketId,
    actorId: user.id,
    type: TicketActivityType.assignment_change,
    fromStatus: ticket.status,
    toStatus: updatedTicket.status,
    fromAssigneeId: requesterId,
    toAssigneeId: null,
  });
  return updatedTicket;
}

export async function appendAttachments(
  ticketId: string,
  attachmentPaths: string[],
  user: RequestUser,
) {
  if (!attachmentPaths.length) {
    throw createError(400, "No attachments provided");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketCoreSelect,
  });
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (user.role === Role.user && ticket.createdBy !== user.id) {
    throw createError(403, "You cannot update attachments for this ticket");
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { attachments: [...ticket.attachments, ...attachmentPaths] },
    include: ticketInclude,
  });

  notifyTicketChange(updatedTicket);

  if (user.role === Role.user) {
    await logTicketActivity({
      ticketId,
      actorId: user.id,
      type: "ticket_update" as TicketActivityType,
      fromStatus: ticket.status,
      toStatus: updatedTicket.status,
      fromAssigneeId: ticket.assignedTo,
      toAssigneeId: ticket.assignedTo,
    });
  }
  return updatedTicket;
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

    notifyTicketChange(ticket, "tickets:created");
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

export async function listTicketActivity(
  ticketId: string,
  user: RequestUser,
  limit = 50,
) {
  await getTicket(ticketId, user);

  const take = Math.min(Math.max(limit, 1), 200);

  return prisma.ticketActivity.findMany({
    where: { ticketId },
    orderBy: { createdAt: "desc" },
    take,
    include: ticketActivityInclude,
  });
}

export async function listRecentTicketActivity(
  limit: number,
  user: RequestUser,
) {
  const take = Math.min(Math.max((limit ?? 25) || 25, 1), 200);
  if (user.role === Role.admin) {
    return prisma.ticketActivity.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: ticketActivityInclude,
    });
  }

  if (user.role === Role.agent) {
    return prisma.ticketActivity.findMany({
      where: {
        ticket: {
          OR: [{ assignedTo: user.id }, { assignmentRequestId: user.id }],
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      include: ticketActivityInclude,
    });
  }

  if (user.role === Role.user) {
    return prisma.ticketActivity.findMany({
      where: { ticket: { createdBy: user.id } },
      orderBy: { createdAt: "desc" },
      take,
      include: ticketActivityInclude,
    });
  }

  throw createError(403, "Unsupported role for ticket activity reports");
}

export async function getTicketStatusSummary(user: RequestUser) {
  if (user.role !== Role.admin) {
    throw createError(403, "Only admins can view ticket reports");
  }

  const [statusBuckets, assignmentBuckets] = await prisma.$transaction([
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.ticket.groupBy({
      by: ["assignedTo"],
      _count: { _all: true },
      where: { assignedTo: { not: null } },
      orderBy: { assignedTo: "asc" },
    }),
  ]);

  const agentIds = assignmentBuckets
    .map((bucket) => bucket.assignedTo)
    .filter((value): value is string => Boolean(value));

  const agents = agentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  return {
    statuses: statusBuckets.map((bucket) => ({
      status: bucket.status,
      count: extractAggregateCount(bucket._count),
    })),
    assignments: assignmentBuckets
      .filter((bucket) => bucket.assignedTo)
      .map((bucket) => ({
        agentId: bucket.assignedTo as string,
        count: extractAggregateCount(bucket._count),
        agent: agents.find((agent) => agent.id === bucket.assignedTo) ?? null,
      })),
  };
}
