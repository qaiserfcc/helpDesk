import { apiClient } from "./apiClient";

export type TicketPriority = "low" | "medium" | "high";

export interface SLA {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string | null;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
}

export interface CreateSLAPayload {
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string | null;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  active?: boolean;
}

export interface UpdateSLAPayload {
  name?: string;
  description?: string;
  subcategoryId?: string | null;
  priority?: TicketPriority;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
  active?: boolean;
}

export async function fetchSLAs(
  categoryId?: string,
  activeOnly = false,
): Promise<SLA[]> {
  const params = new URLSearchParams();
  if (categoryId) {
    params.append("categoryId", categoryId);
  }
  if (activeOnly) {
    params.append("active", "true");
  }

  const response = await apiClient.get<{ slas: SLA[] }>(
    `/slas?${params.toString()}`,
  );
  return response.data.slas || [];
}

export async function fetchSLA(slaId: string): Promise<SLA> {
  const response = await apiClient.get<{ sla: SLA }>(`/slas/${slaId}`);
  return response.data.sla;
}

export async function createSLA(payload: CreateSLAPayload): Promise<SLA> {
  const response = await apiClient.post<{ sla: SLA }>("/slas", payload);
  return response.data.sla;
}

export async function updateSLA(
  slaId: string,
  payload: UpdateSLAPayload,
): Promise<SLA> {
  const response = await apiClient.patch<{ sla: SLA }>(
    `/slas/${slaId}`,
    payload,
  );
  return response.data.sla;
}

export async function deleteSLA(slaId: string): Promise<void> {
  await apiClient.delete(`/slas/${slaId}`);
}

export interface SLAStatus {
  slaId: string | null;
  responseTimeDue: string | null;
  resolutionTimeDue: string | null;
  responseTimeRemaining: number | null;
  resolutionTimeRemaining: number | null;
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  responseTimeUsed: number | null;
  resolutionTimeUsed: number | null;
}

export async function fetchTicketSLAStatus(ticketId: string): Promise<SLAStatus> {
  const response = await apiClient.get<{ slaStatus: SLAStatus }>(
    `/slas/ticket/${ticketId}/status`,
  );
  return response.data.slaStatus;
}

export interface TicketWithSLA {
  id: string;
  description: string;
  priority: TicketPriority;
  status: string;
  createdAt: string;
  slaResponseBreached: boolean;
  slaResolutionBreached: boolean;
  creator: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
}

export async function fetchTicketsBreachingSLA(): Promise<TicketWithSLA[]> {
  const response = await apiClient.get<{ tickets: TicketWithSLA[] }>(
    "/slas/breaches",
  );
  return response.data.tickets || [];
}
