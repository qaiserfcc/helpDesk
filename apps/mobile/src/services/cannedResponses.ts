import { apiClient } from './apiClient';

export interface CannedResponse {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  categoryId?: string | null;
  active: boolean;
}

export async function fetchCannedResponses(): Promise<CannedResponse[]> {
  const response = await apiClient.get<{ cannedResponses: CannedResponse[] }>('/canned-responses');
  return response.data.cannedResponses || [];
}
