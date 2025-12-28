import { apiClient } from "@/services/apiClient";

export type AttributeType = "text" | "number" | "select" | "multiselect" | "date";

export type TicketAttribute = {
  id: string;
  name: string;
  label: string;
  type: AttributeType;
  options: string[];
  defaultValue: string | null;
  isMandatory: boolean;
  isVisible: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateAttributePayload = {
  name: string;
  label: string;
  type: AttributeType;
  options?: string[];
  defaultValue?: string;
  isMandatory?: boolean;
  isVisible?: boolean;
  order?: number;
};

export type UpdateAttributePayload = {
  label?: string;
  type?: AttributeType;
  options?: string[];
  defaultValue?: string | null;
  isMandatory?: boolean;
  isVisible?: boolean;
  order?: number;
};

export async function listAttributes(): Promise<TicketAttribute[]> {
  const response = await apiClient.get<{ attributes: TicketAttribute[] }>(
    "/attributes",
  );
  return response.data.attributes;
}

export async function getAttribute(
  attributeId: string,
): Promise<TicketAttribute> {
  const response = await apiClient.get<{ attribute: TicketAttribute }>(
    `/attributes/${attributeId}`,
  );
  return response.data.attribute;
}

export async function createAttribute(
  payload: CreateAttributePayload,
): Promise<TicketAttribute> {
  const response = await apiClient.post<{ attribute: TicketAttribute }>(
    "/attributes",
    payload,
  );
  return response.data.attribute;
}

export async function updateAttribute(
  attributeId: string,
  payload: UpdateAttributePayload,
): Promise<TicketAttribute> {
  const response = await apiClient.patch<{ attribute: TicketAttribute }>(
    `/attributes/${attributeId}`,
    payload,
  );
  return response.data.attribute;
}

export async function deleteAttribute(attributeId: string): Promise<void> {
  await apiClient.delete(`/api/attributes/${attributeId}`);
}
