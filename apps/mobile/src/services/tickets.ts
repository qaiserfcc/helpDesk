import { apiClient } from "@/services/apiClient";

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

export async function assignTicket(ticketId: string, assigneeId?: string) {
  const response = await apiClient.post<{ ticket: Ticket }>(
    `/tickets/${ticketId}/assign`,
    { assigneeId },
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
  return response.data.ticket;
}
