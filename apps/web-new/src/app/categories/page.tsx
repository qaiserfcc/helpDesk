"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  categoriesService,
  type Category,
} from "@/services/categories";
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

type CategoryFormValues = {
  name: string;
  description: string;
  active: boolean;
};

type FormErrors = Record<string, string>;

const makeEmptyForm = (): CategoryFormValues => ({
  name: "",
  description: "",
  active: true,
});

export default function CategoriesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<CategoryFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
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

  const saving =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;
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
              renderItem={(entry) => (
                <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
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
              )}
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
    </div>
  );
}
