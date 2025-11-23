import { apiClient } from "@/services/apiClient";
import {
  getCachedTicket,
  primeTicketCacheEntries,
  serializeScope,
  upsertTicketCaches,
  withTicketCache,
} from "@/services/ticketCache";
import { queueTicketAction } from "@/storage/offline-db";
import { useOfflineStore } from "@/store/useOfflineStore";

export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";
export type IssueType =
  | "hardware"
  | "software"
  | "network"
  | "access"
  | "other";

export type TicketUser = {
  id: string;
  name: string;
  email: string;
};

export type Ticket = {
  id: string;
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
  status: TicketStatus;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  creator: TicketUser;
  assignee: TicketUser | null;
  assignmentRequest: TicketUser | null;
  pendingSync?: boolean;
  pendingAction?: string;
  isLocalOnly?: boolean;
};

export type ReportTicket = {
  id: string;
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  creator: TicketUser;
  assignee: TicketUser | null;
};

export type TicketActivityType =
  | "status_change"
  | "assignment_change"
  | "assignment_request"
  | "ticket_update";

export type TicketActivityEntry = {
  id: string;
  ticketId: string;
  type: TicketActivityType;
  createdAt: string;
  actor: TicketUser & { role: "user" | "agent" | "admin" };
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  fromAssignee: TicketUser | null;
  toAssignee: TicketUser | null;
};

export type TicketSummaryReport = {
  statuses: Array<{ status: TicketStatus; count: number }>;
  assignments: Array<{
    agentId: string;
    count: number;
    agent: TicketUser | null;
  }>;
};

export type StatusCounts = Record<TicketStatus, number>;

export type UserTicketReport = {
  statusCounts: StatusCounts;
  tickets: ReportTicket[];
};

export type AgentWorkloadReport = {
  statusCounts: StatusCounts;
  assigned: ReportTicket[];
  pendingRequests: ReportTicket[];
  escalations: ReportTicket[];
};

export type AdminOverviewReport = {
  statusCounts: StatusCounts;
  assignmentLoad: Array<{
    agentId: string;
    count: number;
    agent: TicketUser | null;
  }>;
  oldestOpen: ReportTicket[];
};

export type AdminEscalationReport = {
  highPriority: ReportTicket[];
  staleTickets: ReportTicket[];
};

export type AdminProductivityReport = {
  resolutionTrend: Array<{ date: string; count: number }>;
};

export type TicketExportScope = "auto" | "user" | "agent" | "admin";

export type TicketExportFilters = {
  agentId?: string;
  creatorId?: string;
  status?: TicketStatus;
  format?: "json" | "csv";
  scope?: TicketExportScope;
};

export type TicketFilters = {
  status?: TicketStatus;
  issueType?: IssueType;
  assignedToMe?: boolean;
  limit?: number;
};

export type CreateTicketPayload = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
  attachments?: string[];
};

export type UpdateTicketPayload = Partial<CreateTicketPayload> & {
  status?: TicketStatus;
};

type TicketLike = { id?: string | null } & Record<string, unknown>;

const BASE_TICKET_LIST_SCOPE = serializeScope("tickets:list");

function buildTicketPrimers(tickets: TicketLike[]) {
  return tickets
    .filter((ticket): ticket is TicketLike & { id: string } =>
      Boolean(ticket?.id),
    )
    .map((ticket) => ({
      scope: serializeScope("tickets:item", { ticketId: ticket.id }),
      payload: ticket,
    }));
}

export async function fetchTickets(filters: TicketFilters = {}) {
  const scope = serializeScope("tickets:list", filters);
  return withTicketCache(scope, async () => {
    const response = await apiClient.get<{ tickets: Ticket[] }>("/tickets", {
      params: filters,
    });
    await primeTicketCacheEntries(buildTicketPrimers(response.data.tickets));
    return response.data.tickets;
  });
}

export async function fetchTicket(ticketId: string) {
  const scope = serializeScope("tickets:item", { ticketId });
  return withTicketCache(scope, async () => {
    const response = await apiClient.get<{ ticket: Ticket }>(
      `/tickets/${ticketId}`,
    );
    return response.data.ticket;
  });
}

export async function createTicket(payload: CreateTicketPayload) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    "/tickets",
    payload,
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

export async function updateTicket(
  ticketId: string,
  payload: UpdateTicketPayload,
) {
  if (isOffline()) {
    await queueTicketAction({
      action: "ticket.update",
      method: "PATCH",
      endpoint: `/tickets/${ticketId}`,
      payload,
      ticketId,
      optimistic: payload,
    });
    return applyOptimisticTicketPatch(ticketId, "ticket.update", () => ({
      ...payload,
      updatedAt: new Date().toISOString(),
    }));
  }

  const response = await apiClient.patch<{ ticket: Ticket }>(
    `/tickets/${ticketId}`,
    payload,
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

type AssigneeSnapshot = Pick<TicketUser, "id" | "name" | "email"> | null;

export async function assignTicket(
  ticketId: string,
  assigneeId?: string,
  options?: { assignee?: AssigneeSnapshot },
) {
  const payload = assigneeId ? { assigneeId } : {};

  if (isOffline()) {
    await queueTicketAction({
      action: "ticket.assign",
      method: "POST",
      endpoint: `/tickets/${ticketId}/assign`,
      payload,
      ticketId,
      optimistic: options?.assignee ?? null,
    });
    return applyOptimisticTicketPatch(ticketId, "ticket.assign", (current) => {
      const snapshot = options?.assignee
        ? {
            id: options.assignee.id,
            name: options.assignee.name,
            email: options.assignee.email,
          }
        : (current?.assignee ?? null);
      const shouldBumpStatus = (current?.status ?? "open") === "open";
      return {
        assignee: snapshot,
        assignmentRequest: null,
        status: shouldBumpStatus ? "in_progress" : (current?.status ?? "open"),
        updatedAt: new Date().toISOString(),
      } as Partial<Ticket>;
    });
  }

  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/assign`,
    payload,
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

export async function resolveTicket(ticketId: string) {
  if (isOffline()) {
    await queueTicketAction({
      action: "ticket.resolve",
      method: "POST",
      endpoint: `/tickets/${ticketId}/resolve`,
      payload: {},
      ticketId,
    });
    return applyOptimisticTicketPatch(ticketId, "ticket.resolve", () => ({
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/resolve`,
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

export async function requestAssignment(ticketId: string) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/request-assignment`,
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

export async function declineAssignmentRequest(ticketId: string) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/assignment-request/decline`,
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

export async function fetchTicketActivity(ticketId: string, limit = 50) {
  const scope = serializeScope("tickets:activity", { ticketId, limit });
  return withTicketCache(scope, async () => {
    const response = await apiClient.get<{ activities: TicketActivityEntry[] }>(
      `/tickets/${ticketId}/activity`,
      { params: { limit } },
    );
    return response.data.activities;
  });
}

export async function fetchRecentTicketActivity(limit = 25) {
  const scope = serializeScope("reports:activity", { limit });
  return withTicketCache(scope, async () => {
    const response = await apiClient.get<{ activities: TicketActivityEntry[] }>(
      "/reports/tickets/activity",
      { params: { limit } },
    );
    return response.data.activities;
  });
}

export async function fetchTicketStatusSummary() {
  return withTicketCache("reports:status-summary", async () => {
    const response = await apiClient.get<{ summary: TicketSummaryReport }>(
      "/reports/tickets/status-summary",
    );
    return response.data.summary;
  });
}

export async function fetchUserTicketReport() {
  return withTicketCache("reports:user", async () => {
    const response = await apiClient.get<{ report: UserTicketReport }>(
      "/reports/users/me/tickets",
    );
    await primeTicketCacheEntries(
      buildTicketPrimers(response.data.report.tickets),
    );
    return response.data.report;
  });
}

export async function fetchAgentWorkloadReport() {
  return withTicketCache("reports:agent", async () => {
    const response = await apiClient.get<{ report: AgentWorkloadReport }>(
      "/reports/agents/me/workload",
    );
    const report = response.data.report;
    const extras = [
      ...report.assigned,
      ...report.pendingRequests,
      ...report.escalations,
    ];
    await primeTicketCacheEntries(buildTicketPrimers(extras));
    return response.data.report;
  });
}

export async function fetchAdminOverviewReport() {
  return withTicketCache("reports:admin-overview", async () => {
    const response = await apiClient.get<{ report: AdminOverviewReport }>(
      "/reports/admin/overview",
    );
    await primeTicketCacheEntries(
      buildTicketPrimers(response.data.report.oldestOpen),
    );
    return response.data.report;
  });
}

export async function fetchAdminEscalationReport() {
  return withTicketCache("reports:admin-escalation", async () => {
    const response = await apiClient.get<{ report: AdminEscalationReport }>(
      "/reports/admin/escalations",
    );
    const report = response.data.report;
    await primeTicketCacheEntries(
      buildTicketPrimers([...report.highPriority, ...report.staleTickets]),
    );
    return response.data.report;
  });
}

export async function fetchAdminProductivityReport(days?: number) {
  const scope = serializeScope("reports:admin-productivity", { days });
  return withTicketCache(scope, async () => {
    const response = await apiClient.get<{ report: AdminProductivityReport }>(
      "/reports/admin/productivity",
      { params: { days } },
    );
    return response.data.report;
  });
}

export async function fetchTicketExportDataset(
  filters: TicketExportFilters = {},
) {
  const scope = serializeScope("reports:export", filters);
  return withTicketCache(scope, async () => {
    const response = await apiClient.get<{
      scope: string;
      tickets: ReportTicket[];
    }>("/reports/tickets/export", {
      params: {
        scope: filters.scope ?? "auto",
        agentId: filters.agentId,
        creatorId: filters.creatorId,
        status: filters.status,
        format: filters.format ?? "json",
      },
    });
    await primeTicketCacheEntries(
      buildTicketPrimers(response.data.tickets ?? []),
    );
    return response.data;
  });
}

export async function uploadTicketAttachments(
  ticketId: string,
  files: { uri: string; name: string; type: string }[],
) {
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  });
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/attachments`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  const ticket = response.data.ticket;
  await upsertTicketCaches(ticket, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return ticket;
}

type OfflineActionType =
  | "ticket.create"
  | "ticket.update"
  | "ticket.assign"
  | "ticket.resolve";

function isOffline() {
  return useOfflineStore.getState().isOffline;
}

async function applyOptimisticTicketPatch(
  ticketId: string,
  action: OfflineActionType,
  patch:
    | Partial<Ticket>
    | ((current: Ticket | null) => Partial<Ticket> | undefined),
) {
  const current = (await getCachedTicket<Ticket>(ticketId)) ?? null;
  const resolvedPatch =
    typeof patch === "function" ? (patch(current) ?? {}) : (patch ?? {});
  const fallbackTicket: Ticket = {
    id: ticketId,
    description: "",
    priority: "medium",
    issueType: "other",
    status: "open",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    creator: {
      id: "",
      name: "",
      email: "",
    },
    assignee: null,
    assignmentRequest: null,
  };
  const nextBase: Ticket = current ? { ...current } : fallbackTicket;

  const next: Ticket = {
    ...nextBase,
    ...resolvedPatch,
    pendingSync: true,
    pendingAction: action,
    updatedAt: resolvedPatch.updatedAt ?? new Date().toISOString(),
  };

  await upsertTicketCaches(next, { listScopes: [BASE_TICKET_LIST_SCOPE] });
  return next;
}
