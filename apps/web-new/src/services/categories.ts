import { apiClient } from "./apiClient";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const categoriesService = {
  listCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get("/categories");
    return response.data.categories;
  },

  listAllCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get("/categories/all");
    return response.data.categories;
  },

  getCategory: async (categoryId: string): Promise<Category> => {
    const response = await apiClient.get(`/categories/${categoryId}`);
    return response.data.category;
  },

  createCategory: async (data: {
    name: string;
    description?: string;
  }): Promise<Category> => {
    const response = await apiClient.post("/categories", data);
    return response.data.category;
  },

  updateCategory: async (
    categoryId: string,
    data: Partial<{ name: string; description: string; active: boolean }>,
  ): Promise<Category> => {
    const response = await apiClient.patch(`/categories/${categoryId}`, data);
    return response.data.category;
  },

  deleteCategory: async (categoryId: string): Promise<Category> => {
    const response = await apiClient.delete(`/categories/${categoryId}`);
    return response.data.category;
  },
};
