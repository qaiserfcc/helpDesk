import { apiClient } from "./apiClient";

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

  getSubcategory: async (subcategoryId: string): Promise<Subcategory> => {
    const response = await apiClient.get(`/subcategories/${subcategoryId}`);
    return response.data.subcategory;
  },

  createSubcategory: async (data: {
    categoryId: string;
    name: string;
    description?: string;
  }): Promise<Subcategory> => {
    const response = await apiClient.post("/subcategories", data);
    return response.data.subcategory;
  },

  updateSubcategory: async (
    subcategoryId: string,
    data: Partial<{ name: string; description: string; active: boolean }>,
  ): Promise<Subcategory> => {
    const response = await apiClient.patch(
      `/subcategories/${subcategoryId}`,
      data,
    );
    return response.data.subcategory;
  },

  deleteSubcategory: async (subcategoryId: string): Promise<Subcategory> => {
    const response = await apiClient.delete(`/subcategories/${subcategoryId}`);
    return response.data.subcategory;
  },
};
