import { apiClient } from "@/services/apiClient";
import type { Attribute, AttributeType } from "@/services/tickets";
export type { Attribute, AttributeType } from "@/services/tickets";

export type CreateAttributePayload = {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
  required?: boolean;
  visibleTo?: Array<"user" | "agent" | "admin">;
  active?: boolean;
  order?: number;
};

export type UpdateAttributePayload = Partial<CreateAttributePayload>;

export async function fetchVisibleAttributes() {
  const response = await apiClient.get<{ attributes: Attribute[] }>("/attributes");
  return response.data.attributes;
}

export async function fetchAllAttributes() {
  const response = await apiClient.get<{ attributes: Attribute[] }>("/attributes/all");
  return response.data.attributes;
}

export async function createAttribute(payload: CreateAttributePayload) {
  const response = await apiClient.post<{ attribute: Attribute }>("/attributes", payload);
  return response.data.attribute;
}

export async function updateAttribute(attributeId: string, payload: UpdateAttributePayload) {
  const response = await apiClient.patch<{ attribute: Attribute }>(`/attributes/${attributeId}`, payload);
  return response.data.attribute;
}

export async function deleteAttribute(attributeId: string) {
  const response = await apiClient.delete<{ attribute: Attribute }>(`/attributes/${attributeId}`);
  return response.data.attribute;
}
