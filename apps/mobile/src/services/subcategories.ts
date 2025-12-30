import { apiClient } from "@/services/apiClient";

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const subcategoriesService = {
  listByCategory: async (categoryId: string): Promise<Subcategory[]> => {
    const response = await apiClient.get(
      `/subcategories/category/${categoryId}`,
    );
    return response.data.subcategories;
  },
};
