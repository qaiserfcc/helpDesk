import { api } from "@/lib/api";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface CreateSubcategoryData {
  name: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateSubcategoryData {
  name?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

// Categories
export async function fetchCategories(): Promise<Category[]> {
  const response = await api.get("/categories");
  return response.data;
}

export async function fetchCategory(id: string): Promise<Category> {
  const response = await api.get(`/categories/${id}`);
  return response.data;
}

export async function createCategory(
  data: CreateCategoryData
): Promise<Category> {
  const response = await api.post("/categories", data);
  return response.data;
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryData
): Promise<Category> {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// Subcategories
export async function fetchSubcategories(
  categoryId: string
): Promise<Subcategory[]> {
  const response = await api.get(`/categories/${categoryId}/subcategories`);
  return response.data;
}

export async function createSubcategory(
  categoryId: string,
  data: CreateSubcategoryData
): Promise<Subcategory> {
  const response = await api.post(
    `/categories/${categoryId}/subcategories`,
    data
  );
  return response.data;
}

export async function updateSubcategory(
  categoryId: string,
  subcategoryId: string,
  data: UpdateSubcategoryData
): Promise<Subcategory> {
  const response = await api.put(
    `/categories/${categoryId}/subcategories/${subcategoryId}`,
    data
  );
  return response.data;
}

export async function deleteSubcategory(
  categoryId: string,
  subcategoryId: string
): Promise<void> {
  await api.delete(`/categories/${categoryId}/subcategories/${subcategoryId}`);
}
