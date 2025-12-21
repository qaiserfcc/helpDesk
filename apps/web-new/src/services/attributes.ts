import { apiClient } from "./apiClient";

export type AttributeType = "text" | "number" | "select" | "multiselect" | "date" | "boolean";

export type TicketAttribute = {
  id: string;
  name: string;
  label: string;
  type: AttributeType;
  mandatory: boolean;
  visible: boolean;
  options?: any;
  defaultValue?: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TicketAttributeValue = {
  id: string;
  ticketId: string;
  attributeId: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAttributePayload = {
  name: string;
  label: string;
  type: AttributeType;
  mandatory?: boolean;
  visible?: boolean;
  options?: any;
  defaultValue?: string;
  order?: number;
  active?: boolean;
};

export type UpdateAttributePayload = {
  name?: string;
  label?: string;
  type?: AttributeType;
  mandatory?: boolean;
  visible?: boolean;
  options?: any;
  defaultValue?: string;
  order?: number;
  active?: boolean;
};

export type SetAttributeValuePayload = {
  value: string;
};

export async function fetchAttributes() {
  const { data } = await apiClient.get<TicketAttribute[]>("/attributes");
  return data;
}

export async function fetchAttribute(attributeId: string) {
  const { data } = await apiClient.get<TicketAttribute>(`/attributes/${attributeId}`);
  return data;
}

export async function createAttribute(payload: CreateAttributePayload) {
  const { data } = await apiClient.post<TicketAttribute>("/attributes", payload);
  return data;
}

export async function updateAttribute(attributeId: string, payload: UpdateAttributePayload) {
  const { data } = await apiClient.patch<TicketAttribute>(`/attributes/${attributeId}`, payload);
  return data;
}

export async function deleteAttribute(attributeId: string) {
  await apiClient.delete(`/attributes/${attributeId}`);
}

export async function fetchTicketAttributeValues(ticketId: string) {
  const { data } = await apiClient.get<TicketAttributeValue[]>(`/attributes/tickets/${ticketId}/values`);
  return data;
}

export async function setTicketAttributeValue(ticketId: string, attributeId: string, payload: SetAttributeValuePayload) {
  const { data } = await apiClient.put<TicketAttributeValue>(`/attributes/tickets/${ticketId}/attributes/${attributeId}`, payload);
  return data;
}

export default {
  fetchAttributes,
  fetchAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  fetchTicketAttributeValues,
  setTicketAttributeValue,
};
