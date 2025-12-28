"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  categoriesService,
  type Category,
} from "@/services/categories";
import {
  subcategoriesService,
  type Subcategory,
} from "@/services/subcategories";
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

type CategoryFormValues = {
  name: string;
  description: string;
  active: boolean;
};

type SubcategoryFormValues = {
  categoryId: string;
  name: string;
  description: string;
  active: boolean;
};

type FormErrors = Record<string, string>;

const makeEmptyCategoryForm = (): CategoryFormValues => ({
  name: "",
  description: "",
  active: true,
});

const makeEmptySubcategoryForm = (): SubcategoryFormValues => ({
  categoryId: "",
  name: "",
  description: "",
  active: true,
});

export default function CategoriesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<CategoryFormValues>(makeEmptyCategoryForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Subcategory form state
  const [subcategoryFormVisible, setSubcategoryFormVisible] = useState(false);
  const [subcategoryFormMode, setSubcategoryFormMode] = useState<"create" | "edit">("create");
  const [subcategoryFormValues, setSubcategoryFormValues] = useState<SubcategoryFormValues>(makeEmptySubcategoryForm());
  const [subcategoryFormErrors, setSubcategoryFormErrors] = useState<FormErrors>({});
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);

  const {
    data: categories,
    isLoading: categoriesLoading,
    isRefetching: categoriesRefetching,
    refetch: refetchCategories,
    error: categoriesError,
  } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: categoriesService.listAllCategories,
    enabled: user?.role === "admin",
  });

  const refreshing = categoriesRefetching;
  const categoryList = categories ?? [];

  const handleRefresh = () => {
    refetchCategories();
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const resetFormState = () => {
    setFormValues(makeEmptyCategoryForm());
    setFormErrors({});
    setActiveCategoryId(null);
  };

  const closeForm = () => {
    resetFormState();
    setFormVisible(false);
  };

  const openCreateForm = () => {
    resetFormState();
    setFormMode("create");
    setFormVisible(true);
  };

  const openEditForm = (entry: Category) => {
    setFormMode("edit");
    setActiveCategoryId(entry.id);
    setFormErrors({});
    setFormValues({
      name: entry.name,
      description: entry.description ?? "",
      active: entry.active,
    });
    setFormVisible(true);
  };

  // Subcategory form functions
  const resetSubcategoryFormState = () => {
    setSubcategoryFormValues(makeEmptySubcategoryForm());
    setSubcategoryFormErrors({});
    setActiveSubcategoryId(null);
  };

  const closeSubcategoryForm = () => {
    resetSubcategoryFormState();
    setSubcategoryFormVisible(false);
  };

  const openCreateSubcategoryForm = (categoryId: string) => {
    resetSubcategoryFormState();
    setSubcategoryFormMode("create");
    setSubcategoryFormValues((prev) => ({ ...prev, categoryId }));
    setSubcategoryFormVisible(true);
  };

  const openEditSubcategoryForm = (subcategory: Subcategory) => {
    setSubcategoryFormMode("edit");
    setActiveSubcategoryId(subcategory.id);
    setSubcategoryFormErrors({});
    setSubcategoryFormValues({
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      description: subcategory.description ?? "",
      active: subcategory.active,
    });
    setSubcategoryFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save category.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
  };

  const createCategoryMutation = useMutation({
    mutationFn: categoriesService.createCategory,
    onSuccess: (created) => {
      invalidateCategories();
      closeForm();
      alert(`Category "${created.name}" created successfully.`);
    },
    onError: handleMutationError,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: Partial<CategoryFormValues>;
    }) => categoriesService.updateCategory(categoryId, data),
    onSuccess: (updated) => {
      invalidateCategories();
      closeForm();
      alert(`Category "${updated.name}" updated successfully.`);
    },
    onError: handleMutationError,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesService.deleteCategory,
    onMutate: (categoryId) => {
      setPendingDeleteId(categoryId);
    },
    onSuccess: (removed) => {
      invalidateCategories();
      alert(`Category "${removed.name}" deleted.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete category.";
      alert(`Delete failed: ${message}`);
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  // Subcategory mutations
  const createSubcategoryMutation = useMutation({
    mutationFn: subcategoriesService.createSubcategory,
    onSuccess: (created) => {
      invalidateCategories();
      closeSubcategoryForm();
      alert(`Subcategory "${created.name}" created successfully.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to save subcategory.";
      setSubcategoryFormErrors((prev) => ({ ...prev, general: message }));
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({
      subcategoryId,
      data,
    }: {
      subcategoryId: string;
      data: Partial<SubcategoryFormValues>;
    }) => subcategoriesService.updateSubcategory(subcategoryId, data),
    onSuccess: (updated) => {
      invalidateCategories();
      closeSubcategoryForm();
      alert(`Subcategory "${updated.name}" updated successfully.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to update subcategory.";
      setSubcategoryFormErrors((prev) => ({ ...prev, general: message }));
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: subcategoriesService.deleteSubcategory,
    onSuccess: (removed) => {
      invalidateCategories();
      alert(`Subcategory "${removed.name}" deleted.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete subcategory.";
      alert(`Delete failed: ${message}`);
    },
  });

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formValues.name.trim()) {
      errors.name = "Name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formValues.name.trim(),
      description: formValues.description.trim() || undefined,
      active: formValues.active,
    };

    if (formMode === "create") {
      createCategoryMutation.mutate(payload);
      return;
    }

    if (!activeCategoryId) {
      return;
    }

    updateCategoryMutation.mutate({ categoryId: activeCategoryId, data: payload });
  };

  const confirmRemove = (entry: Category) => {
    if (confirm(`Delete category "${entry.name}"? This cannot be undone.`)) {
      deleteCategoryMutation.mutate(entry.id);
    }
  };

  const confirmRemoveSubcategory = (subcategory: Subcategory) => {
    if (confirm(`Delete subcategory "${subcategory.name}"? This cannot be undone.`)) {
      deleteSubcategoryMutation.mutate(subcategory.id);
    }
  };

  const validateSubcategoryForm = (): boolean => {
    const errors: FormErrors = {};

    if (!subcategoryFormValues.categoryId.trim()) {
      errors.categoryId = "Category is required";
    }

    if (!subcategoryFormValues.name.trim()) {
      errors.name = "Name is required";
    }

    setSubcategoryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSubcategoryForm = () => {
    if (!validateSubcategoryForm()) {
      return;
    }

    const payload = {
      categoryId: subcategoryFormValues.categoryId,
      name: subcategoryFormValues.name.trim(),
      description: subcategoryFormValues.description.trim() || undefined,
    };

    if (subcategoryFormMode === "create") {
      createSubcategoryMutation.mutate(payload);
      return;
    }

    if (!activeSubcategoryId) {
      return;
    }

    updateSubcategoryMutation.mutate({
      subcategoryId: activeSubcategoryId,
      data: {
        name: payload.name,
        description: payload.description,
        active: subcategoryFormValues.active,
      },
    });
  };

  const saving =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const subcategorySaving =
    createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending;
  const categoriesInitialLoading = categoriesLoading && !categories;
  const categoriesErrorMessage =
    categoriesError instanceof Error
      ? categoriesError.message
      : "Unable to load categories.";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/80 mb-6">
            You need admin access to manage ticket categories.
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Ticket Categories</h1>
              <p className="text-white/70 mt-2">
                Organize tickets by category and subcategory
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              isLoading={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Categories List */}
        <div className="card rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Categories
              </h2>
              <p className="text-white/70 mt-1">
                {categoryList.length} categor{categoryList.length === 1 ? "y" : "ies"}
              </p>
            </div>
            <Button variant="secondary" onClick={openCreateForm}>
              Add Category
            </Button>
          </div>

          {/* Categories List */}
          {categoriesError ? (
            <div className="card rounded-lg p-6">
              <p className="text-white/80">{categoriesErrorMessage}</p>
            </div>
          ) : (
            <DataList
              data={categoryList}
              getRowKey={(entry) => entry.id}
              isLoading={categoriesInitialLoading}
              emptyMessage="No categories yet. Create one to get started."
              renderItem={(entry) => {
                const isExpanded = expandedCategories.has(entry.id);
                const hasSubcategories = entry.subcategories && entry.subcategories.length > 0;
                
                return (
                  <div className="card rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 flex items-center space-x-3">
                        {hasSubcategories && (
                          <button
                            onClick={() => toggleCategoryExpanded(entry.id)}
                            className="text-white/70 hover:text-white transition-colors"
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-white">{entry.name}</p>
                          <p className="text-sm text-white/70">
                            {entry.description || "No description"}
                          </p>
                          {entry.subcategories && entry.subcategories.length > 0 && (
                            <p className="text-xs text-white/60 mt-1">
                              {entry.subcategories.length} subcategor
                              {entry.subcategories.length === 1 ? "y" : "ies"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            entry.active
                              ? "bg-green-500/15 text-green-400 border border-green-500/20"
                              : "bg-white/5 text-white/70 border border-white/10"
                          }`}
                        >
                          {entry.active ? "Active" : "Inactive"}
                        </span>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCreateSubcategoryForm(entry.id)}
                          >
                            Add Subcategory
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(entry)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => confirmRemove(entry)}
                            isLoading={pendingDeleteId === entry.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Subcategories section */}
                    {isExpanded && hasSubcategories && (
                      <div className="mt-4 ml-8 space-y-2">
                        {entry.subcategories!.map((subcategory) => (
                          <div
                            key={subcategory.id}
                            className="bg-white/5 rounded-lg p-3 flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">
                                {subcategory.name}
                              </p>
                              <p className="text-xs text-white/70">
                                {subcategory.description || "No description"}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  subcategory.active
                                    ? "bg-green-500/15 text-green-400"
                                    : "bg-white/5 text-white/70"
                                }`}
                              >
                                {subcategory.active ? "Active" : "Inactive"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSubcategoryForm(subcategory)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => confirmRemoveSubcategory(subcategory)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Category Form Modal */}
      <Modal
        isOpen={formVisible}
        onClose={closeForm}
        title={
          formMode === "create"
            ? "Create Category"
            : "Edit Category"
        }
        size="md"
      >
        <p className="text-white/80 mb-6">
          {formMode === "create"
            ? "Create a new ticket category."
            : "Update category details."}
        </p>

        <FormField
          label="Category Name"
          type="text"
          placeholder="e.g., Technical Support"
          value={formValues.name}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, name: e.target.value }))
          }
          error={formErrors.name}
          required
        />

        <FormField
          label="Description"
          type="textarea"
          placeholder="Optional description for this category"
          value={formValues.description}
          onChange={(e) =>
            setFormValues((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />

        {/* Active Status */}
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formValues.active}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  active: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-white/30"
            />
            <span className="text-white/90">Active</span>
          </label>
        </div>

        {formErrors.general && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{formErrors.general}</p>
          </div>
        )}

        <ModalActions>
          <Button variant="ghost" onClick={closeForm}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitForm}
            isLoading={saving}
          >
            {formMode === "create" ? "Create Category" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>

      {/* Subcategory Form Modal */}
      <Modal
        isOpen={subcategoryFormVisible}
        onClose={closeSubcategoryForm}
        title={
          subcategoryFormMode === "create"
            ? "Create Subcategory"
            : "Edit Subcategory"
        }
        size="md"
      >
        <p className="text-white/80 mb-6">
          {subcategoryFormMode === "create"
            ? "Create a new subcategory under this category."
            : "Update subcategory details."}
        </p>

        <FormField
          label="Subcategory Name"
          type="text"
          placeholder="e.g., Hardware Issues"
          value={subcategoryFormValues.name}
          onChange={(e) =>
            setSubcategoryFormValues((prev) => ({ ...prev, name: e.target.value }))
          }
          error={subcategoryFormErrors.name}
          required
        />

        <FormField
          label="Description"
          type="textarea"
          placeholder="Optional description for this subcategory"
          value={subcategoryFormValues.description}
          onChange={(e) =>
            setSubcategoryFormValues((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />

        {/* Active Status (only for edit mode) */}
        {subcategoryFormMode === "edit" && (
          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={subcategoryFormValues.active}
                onChange={(e) =>
                  setSubcategoryFormValues((prev) => ({
                    ...prev,
                    active: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-white/30"
              />
              <span className="text-white/90">Active</span>
            </label>
          </div>
        )}

        {subcategoryFormErrors.general && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{subcategoryFormErrors.general}</p>
          </div>
        )}

        <ModalActions>
          <Button variant="ghost" onClick={closeSubcategoryForm}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitSubcategoryForm}
            isLoading={subcategorySaving}
          >
            {subcategoryFormMode === "create" ? "Create Subcategory" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
