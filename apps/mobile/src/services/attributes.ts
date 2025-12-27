import { apiClient } from "./apiClient";

export type AttributeType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "boolean";

export interface TicketAttribute {
  id: string;
  name: string;
  label: string;
  type: AttributeType;
  options: string[] | null;
  mandatory: boolean;
  visible: boolean;
  active: boolean;
  order: number;
  defaultValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketAttributeValue {
  id: string;
  ticketId: string;
  attributeId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
  attribute: TicketAttribute;
}

export interface CreateAttributePayload {
  name: string;
  label: string;
  type: AttributeType;
  options?: string[];
  mandatory?: boolean;
  visible?: boolean;
  active?: boolean;
  order?: number;
  defaultValue?: string;
}

export interface UpdateAttributePayload {
  name?: string;
  label?: string;
  type?: AttributeType;
  options?: string[];
  mandatory?: boolean;
  visible?: boolean;
  active?: boolean;
  order?: number;
  defaultValue?: string;
}

export interface SetAttributeValuePayload {
  value: string;
}

// Attributes
export async function fetchAttributes(): Promise<TicketAttribute[]> {
  const response = await apiClient.get("/attributes");
  return response.data;
}

export async function fetchAttribute(id: string): Promise<TicketAttribute> {
  const response = await apiClient.get(`/attributes/${id}`);
  return response.data;
}

export async function createAttribute(
  payload: CreateAttributePayload,
): Promise<TicketAttribute> {
  const response = await apiClient.post("/attributes", payload);
  return response.data;
}

export async function updateAttribute(
  id: string,
  payload: UpdateAttributePayload,
): Promise<TicketAttribute> {
  const response = await apiClient.put(`/attributes/${id}`, payload);
  return response.data;
}

export async function deleteAttribute(id: string): Promise<void> {
  await apiClient.delete(`/attributes/${id}`);
}

// Attribute Values
export async function fetchTicketAttributeValues(
  ticketId: string,
): Promise<TicketAttributeValue[]> {
  const response = await apiClient.get(`/tickets/${ticketId}/attributes`);
  return response.data;
}

export async function setTicketAttributeValue(
  ticketId: string,
  attributeId: string,
  payload: SetAttributeValuePayload,
): Promise<TicketAttributeValue> {
  const response = await apiClient.post(
    `/tickets/${ticketId}/attributes/${attributeId}`,
    payload,
  );
  return response.data;
}
