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
  attribute?: TicketAttribute;
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
  const { data } = await apiClient.get<{ attributes: TicketAttribute[] }>(
    "/attributes",
  );
  return data.attributes;
}

export async function fetchAttribute(attributeId: string) {
  const { data } = await apiClient.get<{ attribute: TicketAttribute }>(
    `/attributes/${attributeId}`,
  );
  return data.attribute;
}

export async function createAttribute(payload: CreateAttributePayload) {
  const { data } = await apiClient.post<{ attribute: TicketAttribute }>(
    "/attributes",
    payload,
  );
  return data.attribute;
}

export async function updateAttribute(
  attributeId: string,
  payload: UpdateAttributePayload,
) {
  const { data } = await apiClient.patch<{ attribute: TicketAttribute }>(
    `/attributes/${attributeId}`,
    payload,
  );
  return data.attribute;
}

export async function deleteAttribute(attributeId: string) {
  await apiClient.delete(`/attributes/${attributeId}`);
}

export async function fetchTicketAttributeValues(ticketId: string) {
  const { data } = await apiClient.get<{ values: TicketAttributeValue[] }>(
    `/attributes/tickets/${ticketId}/values`,
  );
  return data.values;
}

export async function setTicketAttributeValue(
  ticketId: string,
  attributeId: string,
  payload: SetAttributeValuePayload,
) {
  const { data } = await apiClient.put<{ value: TicketAttributeValue }>(
    `/attributes/tickets/${ticketId}/values/${attributeId}`,
    payload,
  );
  return data.value;
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
