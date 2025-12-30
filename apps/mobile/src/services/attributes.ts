import { apiClient } from "@/services/apiClient";
import type { Attribute } from "@/services/tickets";

export async function fetchVisibleAttributes(): Promise<Attribute[]> {
  const response = await apiClient.get<{ attributes: Attribute[] }>(
    "/attributes",
  );
  return response.data.attributes;
}
