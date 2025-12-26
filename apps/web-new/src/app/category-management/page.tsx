"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Modal } from "@/components/Modal";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
  fetchSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  type Subcategory,
  type CreateSubcategoryPayload,
  type UpdateSubcategoryPayload,
} from "@/services/categories";

type FormMode = "create" | "edit";

type FormValues = {
  name: string;
  description: string;
  active: boolean;
};

type FormErrors = {
  name?: string;
  description?: string;
};

type SubFormValues = {
  categoryId: string;
  name: string;
  description: string;
  active: boolean;
};

type SubFormErrors = {
  categoryId?: string;
  name?: string;
  description?: string;
};

const makeEmptyForm = (): FormValues => ({
  name: "",
  description: "",
  active: true,
});

const makeEmptySubForm = (): SubFormValues => ({
  categoryId: "",
  name: "",
  description: "",
  active: true,
});

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Category name is required";
  }
  if (values.name.length > 100) {
    errors.name = "Category name must be 100 characters or less";
  }
  if (values.description.length > 500) {
    errors.description = "Description must be 500 characters or less";
  }
  return errors;
}

function validateSubForm(values: SubFormValues): SubFormErrors {
  const errors: SubFormErrors = {};
  if (!values.categoryId) {
    errors.categoryId = "Category is required";
  }
  if (!values.name.trim()) {
    errors.name = "Subcategory name is required";
  }
  if (values.name.length > 100) {
    errors.name = "Subcategory name must be 100 characters or less";
  }
  if (values.description.length > 500) {
    errors.description = "Description must be 500 characters or less";
  }
  return errors;
}

export default function CategoryManagementPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formValues, setFormValues] = useState<FormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [subFormMode, setSubFormMode] = useState<FormMode>("create");
  const [subFormValues, setSubFormValues] = useState<SubFormValues>(makeEmptySubForm());
  const [subFormErrors, setSubFormErrors] = useState<SubFormErrors>({});
  const [subFormVisible, setSubFormVisible] = useState(false);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [pendingSubDeleteId, setPendingSubDeleteId] = useState<string | null>(null);

  const {
    data: categories = [],
    isLoading,
    refetch,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(false),
  });

  const {
    data: subcategories = [],
    isLoading: subsLoading,
    refetch: refetchSubs,
  } = useQuery<Subcategory[]>({
    queryKey: ["subcategories"],
    queryFn: () => fetchSubcategories(undefined, false),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setFormVisible(false);
      setFormValues(makeEmptyForm());
      setFormErrors({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCategoryPayload;
    }) => updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setFormVisible(false);
      setActiveCategoryId(null);
      setFormValues(makeEmptyForm());
      setFormErrors({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setPendingDeleteId(null);
    },
  });

  const createSubMutation = useMutation({
    mutationFn: (payload: CreateSubcategoryPayload) => createSubcategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setSubFormVisible(false);
      setSubFormValues(makeEmptySubForm());
      setSubFormErrors({});
      setActiveSubId(null);
    },
  });

  const updateSubMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSubcategoryPayload }) =>
      updateSubcategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setSubFormVisible(false);
      setActiveSubId(null);
      setSubFormValues(makeEmptySubForm());
      setSubFormErrors({});
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: string) => deleteSubcategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setPendingSubDeleteId(null);
    },
  });

  // Check permissions
  if (!user) {
    router.push("/login");
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">
            Only administrators can manage categories.
          </p>
        </div>
      </div>
    );
  }

  function handleCreateClick() {
    setFormMode("create");
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveCategoryId(null);
    setFormVisible(true);
  }

  function handleEditClick(category: Category) {
    setFormMode("edit");
    setFormValues({
      name: category.name,
      description: category.description || "",
      active: category.active,
    });
    setFormErrors({});
    setActiveCategoryId(category.id);
    setFormVisible(true);
  }

  function handleCancelClick() {
    setFormVisible(false);
    setActiveCategoryId(null);
    setFormValues(makeEmptyForm());
    setFormErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      name: formValues.name,
      description: formValues.description || undefined,
      active: formValues.active,
    };

    if (formMode === "create") {
      createMutation.mutate(payload);
    } else if (activeCategoryId) {
      updateMutation.mutate({ id: activeCategoryId, payload });
    }
  }

  function handleDeleteClick(id: string) {
    setPendingDeleteId(id);
  }

  function confirmDelete() {
    if (pendingDeleteId) {
      deleteMutation.mutate(pendingDeleteId);
    }
  }

  function handleSubCreateClick() {
    setSubFormMode("create");
    setSubFormValues(makeEmptySubForm());
    setSubFormErrors({});
    setActiveSubId(null);
    setSubFormVisible(true);
  }

  function handleSubEditClick(sub: Subcategory) {
    setSubFormMode("edit");
    setSubFormValues({
      categoryId: sub.categoryId,
      name: sub.name,
      description: sub.description || "",
      active: sub.active,
    });
    setSubFormErrors({});
    setActiveSubId(sub.id);
    setSubFormVisible(true);
  }

  function handleSubCancelClick() {
    setSubFormVisible(false);
    setActiveSubId(null);
    setSubFormValues(makeEmptySubForm());
    setSubFormErrors({});
  }

  function handleSubSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateSubForm(subFormValues);
    setSubFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: CreateSubcategoryPayload | UpdateSubcategoryPayload = {
      categoryId: subFormValues.categoryId,
      name: subFormValues.name,
      description: subFormValues.description || undefined,
      active: subFormValues.active,
    };

    if (subFormMode === "create") {
      createSubMutation.mutate(payload as CreateSubcategoryPayload);
    } else if (activeSubId) {
      updateSubMutation.mutate({ id: activeSubId, payload });
    }
  }

  function handleSubDeleteClick(id: string) {
    setPendingSubDeleteId(id);
  }

  function confirmSubDelete() {
    if (pendingSubDeleteId) {
      deleteSubMutation.mutate(pendingSubDeleteId);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">
            Category Management
          </h1>
          <button
            onClick={() => router.push("/tickets")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Back to Tickets
          </button>
        </div>

        {/* Create Button */}
        {!formVisible && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleCreateClick}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Category
            </button>
          </div>
        )}

        {/* Form Modal */}
        {formVisible && (
          <Modal
            title={formMode === "create" ? "Create Category" : "Edit Category"}
            onClose={handleCancelClick}
            actions={
              <button
                form="category-form"
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
              >
                {formMode === "create" ? "Create" : "Update"}
              </button>
            }
          >
            <form
              id="category-form"
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., IT Support"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category description..."
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>
              <div className="flex items-center md:col-span-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formValues.active}
                  onChange={(e) => setFormValues({ ...formValues, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">Active</label>
              </div>
            </form>
          </Modal>
        )}

        {/* Categories List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Categories</h2>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No categories found. Create one to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-white">
                          {category.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            category.active
                              ? "bg-green-600/20 text-green-400"
                              : "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {category.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {category.description && (
                        <p className="mt-1 text-sm text-slate-400">
                          {category.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Created: {new Date(category.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(category)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category.id)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subcategories Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Subcategory Management</h2>
            {!subFormVisible && (
              <button
                onClick={handleSubCreateClick}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Subcategory
              </button>
            )}
          </div>

          {subFormVisible && (
            <Modal
              title={subFormMode === "create" ? "Create Subcategory" : "Edit Subcategory"}
              onClose={handleSubCancelClick}
              maxWidthClass="max-w-2xl"
              actions={
                <button
                  form="subcategory-form"
                  type="submit"
                  disabled={createSubMutation.isPending || updateSubMutation.isPending}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
                >
                  {subFormMode === "create" ? "Create" : "Update"}
                </button>
              }
            >
              <form
                id="subcategory-form"
                onSubmit={handleSubSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={subFormValues.categoryId}
                    onChange={(e) => setSubFormValues({ ...subFormValues, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {subFormErrors.categoryId && (
                    <p className="mt-1 text-sm text-red-500">{subFormErrors.categoryId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={subFormValues.name}
                    onChange={(e) => setSubFormValues({ ...subFormValues, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Email Issues"
                  />
                  {subFormErrors.name && (
                    <p className="mt-1 text-sm text-red-500">{subFormErrors.name}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={subFormValues.description}
                    onChange={(e) => setSubFormValues({ ...subFormValues, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Subcategory description..."
                  />
                  {subFormErrors.description && (
                    <p className="mt-1 text-sm text-red-500">{subFormErrors.description}</p>
                  )}
                </div>
                <div className="flex items-center md:col-span-2">
                  <input
                    type="checkbox"
                    id="sub-active"
                    checked={subFormValues.active}
                    onChange={(e) => setSubFormValues({ ...subFormValues, active: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="sub-active" className="ml-2 text-sm font-medium text-gray-700">Active</label>
                </div>
              </form>
            </Modal>
          )}

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Subcategories</h3>
              <button
                onClick={() => refetchSubs()}
                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Refresh
              </button>
            </div>

            {subsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading subcategories...</div>
            ) : subcategories.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No subcategories found. Create one to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {subcategories.map((sub) => {
                  const categoryName =
                    categories.find((c) => c.id === sub.categoryId)?.name || "Unknown";
                  return (
                    <div key={sub.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-xs text-slate-400">{categoryName}</p>
                              <h4 className="text-lg font-medium text-white">{sub.name}</h4>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                sub.active
                                  ? "bg-green-600/20 text-green-400"
                                  : "bg-slate-600/20 text-slate-400"
                              }`}
                            >
                              {sub.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {sub.description && (
                            <p className="mt-1 text-sm text-slate-400">{sub.description}</p>
                          )}
                          <p className="mt-1 text-xs text-slate-500">
                            Created: {new Date(sub.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSubEditClick(sub)}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSubDeleteClick(sub.id)}
                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Subcategory Delete Confirmation Modal */}
        {pendingSubDeleteId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Delete Subcategory</h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete this subcategory? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingSubDeleteId(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubDelete}
                  disabled={deleteSubMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                >
                  {deleteSubMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {pendingDeleteId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                Confirm Delete
              </h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete this category? This action
                cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
