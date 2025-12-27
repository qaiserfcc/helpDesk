import { apiClient } from './apiClient';

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
