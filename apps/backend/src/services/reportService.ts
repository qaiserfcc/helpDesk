import createError from "http-errors";
import { Prisma, Role, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const reportTicketSelect = {
  id: true,
  description: true,
  status: true,
  priority: true,
  issueType: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  creator: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
} as const;

export type ReportTicket = Prisma.TicketGetPayload<{
  select: typeof reportTicketSelect;
}>;

type RequestUser = Express.AuthenticatedUser;

type StatusCount = {
  status: TicketStatus;
  count: number;
};

function mapStatusBuckets(buckets: StatusCount[]) {
  const defaults: Record<TicketStatus, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
  };
  buckets.forEach((bucket) => {
    defaults[bucket.status] = bucket.count;
  });
  return defaults;
}

function assertRole(user: RequestUser | undefined, allowed: Role[]) {
  if (!user) {
    throw createError(401, "Authentication required");
  }
  if (!allowed.includes(user.role)) {
    const rolesStr = allowed.join(", ");
    throw createError(
      403,
      `Insufficient permissions for this report; requires role(s): ${rolesStr}`,
    );
  }
}

export async function getUserTicketReport(user: RequestUser) {
  // Only end-users may request the "users/me" ticket report
  assertRole(user, [Role.user]);

  const [tickets, statusBuckets] = await Promise.all([
    prisma.ticket.findMany({
      where: { createdBy: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: reportTicketSelect,
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { createdBy: user.id },
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
  ]);

  return {
    statusCounts: mapStatusBuckets(
      statusBuckets.map((bucket) => ({
        status: bucket.status,
        count:
          typeof bucket._count === "object" && bucket._count?._all
            ? bucket._count._all
            : 0,
      })),
    ),
    tickets,
  };
}

export async function getAgentWorkloadReport(user: RequestUser) {
  // Only agents may request the "agents/me" workload report
  assertRole(user, [Role.agent]);

  const commonWhere: Prisma.TicketWhereInput = { assignedTo: user.id };
  const [assigned, pendingRequests, statusBuckets] = await Promise.all([
    prisma.ticket.findMany({
      where: commonWhere,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: reportTicketSelect,
    }),
    prisma.ticket.findMany({
      where: { assignmentRequestId: user.id },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: reportTicketSelect,
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: commonWhere,
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
  ]);

  const escalations = assigned.filter((ticket) => {
    if (ticket.status === TicketStatus.resolved) {
      return false;
    }
    const hoursOpen =
      (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
    return ticket.priority === TicketPriority.high || hoursOpen >= 72;
  });

  return {
    statusCounts: mapStatusBuckets(
      statusBuckets.map((bucket) => ({
        status: bucket.status,
        count:
          typeof bucket._count === "object" && bucket._count?._all
            ? bucket._count._all
            : 0,
      })),
    ),
    assigned,
    pendingRequests,
    escalations,
  };
}

export async function getAdminOverviewReport(user: RequestUser) {
  assertRole(user, [Role.admin]);

  const statusBuckets = await prisma.ticket.groupBy({
    by: ["status"],
    _count: { _all: true },
    orderBy: { status: "asc" },
  });

  const assignmentBuckets = await prisma.ticket.groupBy({
    by: ["assignedTo"],
    where: { assignedTo: { not: null } },
    _count: { _all: true },
    orderBy: { assignedTo: "asc" },
  });

  const agentIds = assignmentBuckets
    .map((bucket) => bucket.assignedTo)
    .filter((value): value is string => Boolean(value));
  const agents = agentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const oldestOpen = await prisma.ticket.findMany({
    where: { status: { in: [TicketStatus.open, TicketStatus.in_progress] } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: reportTicketSelect,
  });

  return {
    statusCounts: mapStatusBuckets(
      statusBuckets.map((bucket) => ({
        status: bucket.status,
        count: bucket._count?._all ?? 0,
      })),
    ),
    assignmentLoad: assignmentBuckets
      .filter((bucket) => bucket.assignedTo)
      .map((bucket) => ({
        agentId: bucket.assignedTo as string,
        count: bucket._count?._all ?? 0,
        agent: agents.find((agent) => agent.id === bucket.assignedTo) ?? null,
      })),
    oldestOpen,
  };
}

export async function getAdminEscalationReport(user: RequestUser) {
  assertRole(user, [Role.admin]);

  const highPriority = await prisma.ticket.findMany({
    where: {
      status: { not: TicketStatus.resolved },
      priority: TicketPriority.high,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: reportTicketSelect,
  });

  const staleThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const staleTickets = await prisma.ticket.findMany({
    where: {
      status: { in: [TicketStatus.open, TicketStatus.in_progress] },
      createdAt: { lt: staleThreshold },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: reportTicketSelect,
  });

  return { highPriority, staleTickets };
}

export async function getAdminProductivityReport(user: RequestUser, days = 7) {
  assertRole(user, [Role.admin]);
  const safeDays = Math.min(Math.max(days, 1), 30);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (safeDays - 1));

  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      status: TicketStatus.resolved,
      resolvedAt: { not: null, gte: since },
    },
    select: { resolvedAt: true },
  });

  const trendMap = new Map<string, number>();
  for (let i = 0; i < safeDays; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    trendMap.set(key, 0);
  }

  resolvedTickets.forEach((ticket) => {
    if (!ticket.resolvedAt) return;
    const key = ticket.resolvedAt.toISOString().slice(0, 10);
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
  });

  const resolutionTrend = Array.from(trendMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );

  return { resolutionTrend };
}

export type TicketExportScope = "auto" | "user" | "agent" | "admin";
export type TicketExportFilters = {
  agentId?: string;
  creatorId?: string;
  status?: TicketStatus;
};

function resolveExportScope(user: RequestUser, scope: TicketExportScope) {
  if (scope !== "auto") {
    return scope;
  }
  if (user.role === Role.admin) {
    return "admin";
  }
  if (user.role === Role.agent) {
    return "agent";
  }
  return "user";
}

export async function getTicketExportDataset(
  user: RequestUser,
  scope: TicketExportScope,
  filters: TicketExportFilters = {},
) {
  const effectiveScope = resolveExportScope(user, scope);
  const where: Prisma.TicketWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (effectiveScope === "user") {
    const ownerId = filters.creatorId ?? user.id;
    if (user.role !== Role.admin && ownerId !== user.id) {
      throw createError(403, "Cannot export other users' tickets");
    }
    where.createdBy = ownerId;
  } else if (effectiveScope === "agent") {
    const agentId = filters.agentId ?? user.id;
    if (user.role !== Role.admin && agentId !== user.id) {
      throw createError(403, "Cannot export other agents' tickets");
    }
    where.assignedTo = agentId;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: reportTicketSelect,
  });

  return { scope: effectiveScope, tickets };
}

export function ticketsToCsv(rows: ReportTicket[]) {
  if (!rows.length) {
    return "id,description,status,priority,issueType,creator,assignee,createdAt,resolvedAt";
  }

  const headers = [
    "id",
    "description",
    "status",
    "priority",
    "issueType",
    "creator",
    "assignee",
    "createdAt",
    "resolvedAt",
  ];

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) {
      return "";
    }
    const str = String(value).replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n")) {
      return `"${str}` + `"`;
    }
    return str;
  };

  const lines = rows.map((row) => {
    const creator = row.creator?.name ?? row.creator?.email ?? "";
    const assignee = row.assignee?.name ?? row.assignee?.email ?? "";
    const values = [
      row.id,
      row.description,
      row.status,
      row.priority,
      row.issueType,
      creator,
      assignee,
      row.createdAt.toISOString(),
      row.resolvedAt ? row.resolvedAt.toISOString() : "",
    ];
    return values.map(escapeCsv).join(",");
  });

  return [headers.join(","), ...lines].join("\n");
}

// Get enhanced dashboard metrics
export async function getDashboardMetrics(user: RequestUser) {
  assertRole(user, [Role.admin, Role.agent, Role.user]);

  const now = new Date();

  // Get all active tickets with SLA info
  const tickets = await prisma.ticket.findMany({
    where: user.role === Role.user ? { createdBy: user.id } : {},
    include: {
      sla: true,
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Calculate SLA breaches
  const breachedTickets = tickets.filter((ticket) => {
    if (!ticket.sla || ticket.status === TicketStatus.resolved) return false;

    const createdAt = new Date(ticket.createdAt);
    const hoursElapsed =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Check if response time or resolution time is breached
    return hoursElapsed > ticket.sla.resolutionTimeHours;
  });

  // Get high priority tickets that are not resolved
  const highPriorityTickets = tickets.filter(
    (t) =>
      t.priority === TicketPriority.high && t.status !== TicketStatus.resolved,
  );

  // Get critical alerts (high priority + breached SLA)
  const criticalAlerts = tickets.filter((ticket) => {
    if (!ticket.sla || ticket.status === TicketStatus.resolved) return false;
    if (ticket.priority !== TicketPriority.high) return false;

    const createdAt = new Date(ticket.createdAt);
    const hoursElapsed =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    return hoursElapsed > ticket.sla.resolutionTimeHours;
  });

  // Status breakdown
  const statusCounts = {
    open: tickets.filter((t) => t.status === TicketStatus.open).length,
    in_progress: tickets.filter((t) => t.status === TicketStatus.in_progress)
      .length,
    resolved: tickets.filter((t) => t.status === TicketStatus.resolved).length,
  };

  // Priority breakdown
  const priorityCounts = {
    low: tickets.filter((t) => t.priority === TicketPriority.low).length,
    medium: tickets.filter((t) => t.priority === TicketPriority.medium).length,
    high: tickets.filter((t) => t.priority === TicketPriority.high).length,
  };

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentTickets = tickets.filter(
    (t) => new Date(t.createdAt) > sevenDaysAgo,
  );

  return {
    totalTickets: tickets.length,
    breachedSLA: {
      count: breachedTickets.length,
      tickets: breachedTickets.slice(0, 10).map((t) => ({
        id: t.id,
        description: t.description,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        slaName: t.sla?.name,
        hoursElapsed: Math.round(
          (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60),
        ),
      })),
    },
    highPriority: {
      count: highPriorityTickets.length,
      tickets: highPriorityTickets.slice(0, 10).map((t) => ({
        id: t.id,
        description: t.description,
        status: t.status,
        assignee: t.assignee,
        createdAt: t.createdAt,
      })),
    },
    criticalAlerts: {
      count: criticalAlerts.length,
      tickets: criticalAlerts.slice(0, 10).map((t) => ({
        id: t.id,
        description: t.description,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        slaName: t.sla?.name,
      })),
    },
    statusCounts,
    priorityCounts,
    recentActivity: {
      count: recentTickets.length,
      last7Days: recentTickets.length,
    },
  };
}
