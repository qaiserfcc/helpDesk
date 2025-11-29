import { apiClient } from "./apiClient";

export type AISuggestion = {
  id: string;
  ticketId?: string;
  suggestionType: string;
  prompt: string;
  result: any;
  provider?: string;
  providerMeta?: any;
  createdBy?: string;
  createdAt?: string;
};

export async function suggestReply(ticketId: string) {
  const { data } = await apiClient.post<AISuggestion>(`/ai/tickets/${ticketId}/suggest`);
  return data;
}

export async function fetchSuggestions(ticketId: string) {
  const { data } = await apiClient.get<AISuggestion[]>(`/ai/tickets/${ticketId}/suggestions`);
  return data;
}

export default { suggestReply, fetchSuggestions };
