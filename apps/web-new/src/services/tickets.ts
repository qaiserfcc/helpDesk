import { apiClient } from "@/services/apiClient";

export type AttributeType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "file";

export type Attribute = {
  id: string;
  key: string;
  label: string;
  type: AttributeType;
  options: string[];
  required: boolean;
  visibleTo: Array<"user" | "agent" | "admin">;
  active: boolean;
  order: number;
};

export type TicketAttributeValue = {
  attributeId: string;
  value: unknown;
  attribute: Attribute;
};

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

export type Category = {
  id: string;
  name: string;
};

export type Subcategory = {
  id: string;
  name: string;
  categoryId: string;
};

export type Sla = {
  id: string;
  name: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
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
  category: Category | null;
  subcategory: Subcategory | null;
  sla: Sla | null;
  attributeValues: TicketAttributeValue[];
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
  | "ticket_update"
  | "comment"
  | "reply"
  | "step_completed";

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
  comment?: string | null;
  commentId?: string | null;
  stepId?: string | null;
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
  categoryId?: string;
  subcategoryId?: string;
  attachments?: string[];
  attributes?: Record<string, unknown>;
};

export type UpdateTicketPayload = Partial<CreateTicketPayload> & {
  status?: TicketStatus;
};

export async function fetchTickets(filters: TicketFilters = {}) {
  const response = await apiClient.get<{ tickets: Ticket[] }>("/tickets", {
    params: filters,
  });
  return response.data.tickets;
}

export async function fetchTicket(ticketId: string) {
  const response = await apiClient.get<{ ticket: Ticket }>(
    `/tickets/${ticketId}`,
  );
  return response.data.ticket;
}

export async function createTicket(payload: CreateTicketPayload) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    "/tickets",
    payload,
  );
  return response.data.ticket;
}

export async function deleteTicket(ticketId: string) {
  const response = await apiClient.delete<{ ticket: Ticket }>(
    `/tickets/${ticketId}`,
  );
  return response.data.ticket;
}

export async function updateTicket(
  ticketId: string,
  payload: UpdateTicketPayload,
) {
  const response = await apiClient.patch<{ ticket: Ticket }>(
    `/tickets/${ticketId}`,
    payload,
  );
  return response.data.ticket;
}

export async function assignTicket(
  ticketId: string,
  assigneeId?: string,
) {
  const payload = assigneeId ? { assigneeId } : {};

  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/assign`,
    payload,
  );
  return response.data.ticket;
}

export async function resolveTicket(ticketId: string) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/resolve`,
  );
  return response.data.ticket;
}

export async function requestAssignment(ticketId: string) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/request-assignment`,
  );
  return response.data.ticket;
}

export async function declineAssignmentRequest(ticketId: string) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/assignment-request/decline`,
  );
  return response.data.ticket;
}

export async function fetchTicketActivity(ticketId: string, limit = 50) {
  const response = await apiClient.get<{ activities: TicketActivityEntry[] }>(
    `/tickets/${ticketId}/activity`,
    { params: { limit } },
  );
  return response.data.activities;
}

export async function fetchRecentTicketActivity(limit = 25) {
  const response = await apiClient.get<{ activities: TicketActivityEntry[] }>(
    "/reports/tickets/activity",
    { params: { limit } },
  );
  return response.data.activities;
}

export async function fetchTicketStatusSummary() {
  const response = await apiClient.get<{ summary: TicketSummaryReport }>(
    "/reports/tickets/status-summary",
  );
  return response.data.summary;
}

export async function fetchUserTicketReport() {
  const response = await apiClient.get<{ report: UserTicketReport }>(
    "/reports/users/me/tickets",
  );
  return response.data.report;
}

export async function fetchAgentWorkloadReport() {
  const response = await apiClient.get<{ report: AgentWorkloadReport }>(
    "/reports/agents/me/workload",
  );
  return response.data.report;
}

export async function fetchAdminOverviewReport() {
  const response = await apiClient.get<{ report: AdminOverviewReport }>(
    "/reports/admin/overview",
  );
  return response.data.report;
}

export async function fetchAdminEscalationReport() {
  const response = await apiClient.get<{ report: AdminEscalationReport }>(
    "/reports/admin/escalations",
  );
  return response.data.report;
}

export async function fetchAdminProductivityReport(days?: number) {
  const response = await apiClient.get<{ report: AdminProductivityReport }>(
    "/reports/admin/productivity",
    { params: { days } },
  );
  return response.data.report;
}

export type DashboardMetrics = {
  totalTickets: number;
  breachedSLA: {
    count: number;
    tickets: Array<{
      id: string;
      description: string;
      priority: TicketPriority;
      status: TicketStatus;
      createdAt: string;
      slaName?: string;
      hoursElapsed: number;
    }>;
  };
  highPriority: {
    count: number;
    tickets: Array<{
      id: string;
      description: string;
      status: TicketStatus;
      assignee?: TicketUser | null;
      createdAt: string;
    }>;
  };
  criticalAlerts: {
    count: number;
    tickets: Array<{
      id: string;
      description: string;
      priority: TicketPriority;
      status: TicketStatus;
      createdAt: string;
      slaName?: string;
    }>;
  };
  statusCounts: {
    open: number;
    in_progress: number;
    resolved: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
  };
  recentActivity: {
    count: number;
    last7Days: number;
  };
};

export async function fetchDashboardMetrics() {
  const response = await apiClient.get<{ metrics: DashboardMetrics }>(
    "/reports/dashboard/metrics"
  );
  return response.data.metrics;
}

export async function fetchTicketExportDataset(
  filters: TicketExportFilters = {},
) {
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
  return response.data;
}

export async function uploadTicketAttachments(
  ticketId: string,
  files: File[],
) {
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file);
  });
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/attachments`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data.ticket;
}