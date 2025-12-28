import { apiClient } from "./apiClient";

export interface AutoAssignment {
  id: string;
  subcategoryId: string;
  agentId: string;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  subcategory?: {
    id: string;
    name: string;
    categoryId: string;
  };
}

export const autoAssignService = {
  listAutoAssignments: async (): Promise<AutoAssignment[]> => {
    const response = await apiClient.get("/auto-assign");
    return response.data.autoAssignments;
  },

  listBySubcategory: async (subcategoryId: string): Promise<AutoAssignment[]> => {
    const response = await apiClient.get(
      `/auto-assign/subcategory/${subcategoryId}`,
    );
    return response.data.autoAssignments;
  },

  getAutoAssignment: async (autoAssignId: string): Promise<AutoAssignment> => {
    const response = await apiClient.get(`/auto-assign/${autoAssignId}`);
    return response.data.autoAssignment;
  },

  getForSubcategory: async (subcategoryId: string): Promise<AutoAssignment | null> => {
    const response = await apiClient.get(`/auto-assign/resolve/${subcategoryId}`);
    return response.data.autoAssignment || null;
  },

  createAutoAssignment: async (data: {
    subcategoryId: string;
    agentId: string;
    priority?: number;
  }): Promise<AutoAssignment> => {
    const response = await apiClient.post("/auto-assign", data);
    return response.data.autoAssignment;
  },

  updateAutoAssignment: async (
    autoAssignId: string,
    data: Partial<{ priority: number; active: boolean }>,
  ): Promise<AutoAssignment> => {
    const response = await apiClient.patch(`/auto-assign/${autoAssignId}`, data);
    return response.data.autoAssignment;
  },

  deleteAutoAssignment: async (autoAssignId: string): Promise<AutoAssignment> => {
    const response = await apiClient.delete(`/auto-assign/${autoAssignId}`);
    return response.data.autoAssignment;
  },
};
