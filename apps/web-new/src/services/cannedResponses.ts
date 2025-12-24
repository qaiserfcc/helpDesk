import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export interface CannedResponse {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  categoryId?: string;
  createdBy: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
  creator?: { id: string; name: string; email: string };
}

export interface CreateCannedResponsePayload {
  title: string;
  shortcut: string;
  content: string;
  categoryId?: string;
  active?: boolean;
}

export interface UpdateCannedResponsePayload {
  title?: string;
  shortcut?: string;
  content?: string;
  categoryId?: string;
  active?: boolean;
}

export async function fetchCannedResponses(activeOnly = false, categoryId?: string): Promise<CannedResponse[]> {
  const { data } = await axios.get(`${API_BASE_URL}/api/canned-responses`, {
    params: { active: activeOnly, categoryId },
  });
  return data.responses;
}

export async function searchCannedResponses(query: string): Promise<CannedResponse[]> {
  const { data } = await axios.get(`${API_BASE_URL}/api/canned-responses/search`, {
    params: { q: query },
  });
  return data.responses;
}

export async function fetchCannedResponseByShortcut(shortcut: string): Promise<CannedResponse> {
  const { data } = await axios.get(`${API_BASE_URL}/api/canned-responses/shortcut/${shortcut}`);
  return data.response;
}

export async function fetchCannedResponse(id: string): Promise<CannedResponse> {
  const { data } = await axios.get(`${API_BASE_URL}/api/canned-responses/${id}`);
  return data.response;
}

export async function createCannedResponse(payload: CreateCannedResponsePayload): Promise<CannedResponse> {
  const { data } = await axios.post(`${API_BASE_URL}/api/canned-responses`, payload);
  return data.response;
}

export async function updateCannedResponse(id: string, payload: UpdateCannedResponsePayload): Promise<CannedResponse> {
  const { data } = await axios.patch(`${API_BASE_URL}/api/canned-responses/${id}`, payload);
  return data.response;
}

export async function deleteCannedResponse(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/canned-responses/${id}`);
}
