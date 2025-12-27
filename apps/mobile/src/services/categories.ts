import { apiClient } from "./apiClient";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface CreateSubcategoryPayload {
  name: string;
  categoryId: string;
  description?: string;
  active?: boolean;
}

export interface UpdateSubcategoryPayload {
  name?: string;
  description?: string;
  active?: boolean;
}

// Categories
export async function fetchCategories(): Promise<Category[]> {
  const response = await apiClient.get("/categories");
  return response.data;
}

export async function fetchCategory(id: string): Promise<Category> {
  const response = await apiClient.get(`/categories/${id}`);
  return response.data;
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  const response = await apiClient.post("/categories", payload);
  return response.data;
}

export async function updateCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<Category> {
  const response = await apiClient.put(`/categories/${id}`, payload);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

// Subcategories
export async function fetchSubcategories(
  categoryId: string,
): Promise<Subcategory[]> {
  const response = await apiClient.get(
    `/categories/${categoryId}/subcategories`,
  );
  return response.data;
}

export async function createSubcategory(
  payload: CreateSubcategoryPayload,
): Promise<Subcategory> {
  const response = await apiClient.post(
    `/categories/${payload.categoryId}/subcategories`,
    payload,
  );
  return response.data;
}

export async function updateSubcategory(
  id: string,
  payload: UpdateSubcategoryPayload,
): Promise<Subcategory> {
  const response = await apiClient.put(`/subcategories/${id}`, payload);
  return response.data;
}

export async function deleteSubcategory(id: string): Promise<void> {
  await apiClient.delete(`/subcategories/${id}`);
}
