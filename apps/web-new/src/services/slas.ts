import { apiClient } from "./apiClient";

export interface Sla {
  id: string;
  name: string;
  subcategoryId: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  priority: "low" | "medium" | "high";
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  subcategory?: {
    id: string;
    name: string;
    categoryId: string;
  };
}

export const slasService = {
  listSlas: async (): Promise<Sla[]> => {
    const response = await apiClient.get("/slas");
    return response.data.slas;
  },

  listBySubcategory: async (subcategoryId: string): Promise<Sla[]> => {
    const response = await apiClient.get(`/slas/subcategory/${subcategoryId}`);
    return response.data.slas;
  },

  getSla: async (slaId: string): Promise<Sla> => {
    const response = await apiClient.get(`/slas/${slaId}`);
    return response.data.sla;
  },

  createSla: async (data: {
    subcategoryId: string;
    name: string;
    responseTimeHours: number;
    resolutionTimeHours: number;
    priority?: "low" | "medium" | "high";
    description?: string;
  }): Promise<Sla> => {
    const response = await apiClient.post("/slas", data);
    return response.data.sla;
  },

  updateSla: async (
    slaId: string,
    data: Partial<{
      name: string;
      responseTimeHours: number;
      resolutionTimeHours: number;
      priority: "low" | "medium" | "high";
      description: string;
      active: boolean;
    }>,
  ): Promise<Sla> => {
    const response = await apiClient.patch(`/slas/${slaId}`, data);
    return response.data.sla;
  },

  deleteSla: async (slaId: string): Promise<Sla> => {
    const response = await apiClient.delete(`/slas/${slaId}`);
    return response.data.sla;
  },
};
