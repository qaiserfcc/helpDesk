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
    "/api/attributes",
  );
  return response.attributes;
}

export async function getAttribute(
  attributeId: string,
): Promise<TicketAttribute> {
  const response = await apiClient.get<{ attribute: TicketAttribute }>(
    `/api/attributes/${attributeId}`,
  );
  return response.attribute;
}

export async function createAttribute(
  payload: CreateAttributePayload,
): Promise<TicketAttribute> {
  const response = await apiClient.post<{ attribute: TicketAttribute }>(
    "/api/attributes",
    payload,
  );
  return response.attribute;
}

export async function updateAttribute(
  attributeId: string,
  payload: UpdateAttributePayload,
): Promise<TicketAttribute> {
  const response = await apiClient.patch<{ attribute: TicketAttribute }>(
    `/api/attributes/${attributeId}`,
    payload,
  );
  return response.attribute;
}

export async function deleteAttribute(attributeId: string): Promise<void> {
  await apiClient.delete(`/api/attributes/${attributeId}`);
}
