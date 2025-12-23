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
