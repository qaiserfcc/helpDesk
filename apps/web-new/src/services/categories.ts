import { apiClient } from "./apiClient";

export type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryWithSubcategories = Category & {
  subcategories: Subcategory[];
};

export type Subcategory = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryPayload = {
  name: string;
  description?: string;
  active?: boolean;
};

export type UpdateCategoryPayload = {
  name?: string;
  description?: string;
  active?: boolean;
};

export type CreateSubcategoryPayload = {
  name: string;
  description?: string;
  categoryId: string;
  active?: boolean;
};

export type UpdateSubcategoryPayload = {
  name?: string;
  description?: string;
  active?: boolean;
};

export async function fetchCategories(
  activeOnly = false,
): Promise<Category[]> {
  const params = new URLSearchParams();
  if (activeOnly) {
    params.append("active", "true");
  }
  const response = await apiClient.get<{ categories: Category[] }>(
    `/categories?${params.toString()}`,
  );
  return response.data.categories;
}

export async function fetchCategory(
  id: string,
): Promise<CategoryWithSubcategories> {
  const response = await apiClient.get<{ category: CategoryWithSubcategories }>(
    `/categories/${id}`,
  );
  return response.data.category;
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<CategoryWithSubcategories> {
  const response = await apiClient.post<{ category: CategoryWithSubcategories }>(
    "/categories",
    payload,
  );
  return response.data.category;
}

export async function updateCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<CategoryWithSubcategories> {
  const response = await apiClient.patch<{
    category: CategoryWithSubcategories;
  }>(`/categories/${id}`, payload);
  return response.data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function fetchSubcategories(
  categoryId?: string,
  activeOnly = false,
): Promise<Subcategory[]> {
  let url = "/categories/";
  if (categoryId) {
    url = `/categories/${categoryId}/subcategories`;
  } else {
    url = "/categories/subcategories";
  }
  const params = new URLSearchParams();
  if (activeOnly) {
    params.append("active", "true");
  }
  const response = await apiClient.get<{ subcategories: Subcategory[] }>(
    `${url}?${params.toString()}`,
  );
  return response.data.subcategories;
}

export async function createSubcategory(
  payload: CreateSubcategoryPayload,
): Promise<Subcategory> {
  const response = await apiClient.post<{ subcategory: Subcategory }>(
    "/categories/subcategories",
    payload,
  );
  return response.data.subcategory;
}

export async function updateSubcategory(
  id: string,
  payload: UpdateSubcategoryPayload,
): Promise<Subcategory> {
  const response = await apiClient.patch<{ subcategory: Subcategory }>(
    `/categories/subcategories/${id}`,
    payload,
  );
  return response.data.subcategory;
}

export async function deleteSubcategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/subcategories/${id}`);
}
