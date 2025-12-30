import { apiClient } from "@/services/apiClient";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const categoriesService = {
  listAllCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get("/categories/all");
    return response.data.categories;
  },
};
