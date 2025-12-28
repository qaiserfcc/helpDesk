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
import { DataTable, type Column } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

type SubcategoryFormValues = {
  categoryId: string;
  name: string;
  description: string;
  active: boolean;
};

type FormErrors = Record<string, string>;

const makeEmptyForm = (): SubcategoryFormValues => ({
  categoryId: "",
  name: "",
  description: "",
  active: true,
});

export default function SubcategoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.session?.user);

  const [formVisible, setFormVisible] = useState(false);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<SubcategoryFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Fetch all categories for the filter and form
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => categoriesService.listAllCategories(),
  });

  // Fetch subcategories for selected category
  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ["admin", "subcategories", selectedCategory],
    queryFn: () =>
      selectedCategory
        ? subcategoriesService.listByCategory(selectedCategory)
        : Promise.resolve([]),
    enabled: !!selectedCategory,
  });

  const hasPermission = (role: string | undefined) => {
    return role === "admin";
  };

  if (!hasPermission(user?.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
        <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/70">
            You do not have permission to access subcategory management.
          </p>
        </div>
      </div>
    );
  }

  const openCreateForm = () => {
    setActiveSubcategoryId(null);
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setFormVisible(true);
  };

  const openEditForm = (entry: Subcategory) => {
    setActiveSubcategoryId(entry.id);
    setFormErrors({});
    setFormValues({
      categoryId: entry.categoryId,
      name: entry.name,
      description: entry.description ?? "",
      active: entry.active ?? true,
    });
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setActiveSubcategoryId(null);
    setFormValues(makeEmptyForm());
    setFormErrors({});
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save subcategory.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateSubcategories = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "subcategories"] });
  };

  const createSubcategoryMutation = useMutation({
    mutationFn: (data: { categoryId: string; name: string; description?: string }) =>
      subcategoriesService.createSubcategory(data),
    onSuccess: (created) => {
      invalidateSubcategories();
      closeForm();
      alert(`Subcategory "${created.name}" created successfully.`);
    },
    onError: handleMutationError,
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({
      subcategoryId,
      data,
    }: {
      subcategoryId: string;
      data: Partial<{ name: string; description: string; active: boolean }>;
    }) => subcategoriesService.updateSubcategory(subcategoryId, data),
    onSuccess: (updated) => {
      invalidateSubcategories();
      closeForm();
      alert(`Subcategory "${updated.name}" updated successfully.`);
    },
    onError: handleMutationError,
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (subcategoryId: string) =>
      subcategoriesService.deleteSubcategory(subcategoryId),
    onSuccess: (deleted) => {
      invalidateSubcategories();
      alert(`Subcategory "${deleted.name}" deleted successfully.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete subcategory.";
      alert(message);
    },
  });

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formValues.categoryId.trim()) {
      errors.categoryId = "Category is required.";
    }

    if (!formValues.name.trim()) {
      errors.name = "Subcategory name is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const payload = {
      categoryId: formValues.categoryId,
      name: formValues.name.trim(),
      description: formValues.description.trim() || undefined,
    };

    if (activeSubcategoryId) {
      updateSubcategoryMutation.mutate({
        subcategoryId: activeSubcategoryId,
        data: {
          name: payload.name,
          description: payload.description,
          active: formValues.active,
        },
      });
    } else {
      createSubcategoryMutation.mutate(payload);
    }
  };

  const handleDelete = (entry: Subcategory) => {
    if (
      window.confirm(
        `Are you sure you want to delete the subcategory "${entry.name}"?`
      )
    ) {
      deleteSubcategoryMutation.mutate(entry.id);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row: Subcategory) => (
        <div className="font-medium text-white">{row.name}</div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row: Subcategory) => (
        <div className="text-white/70 text-sm">
          {row.description || "—"}
        </div>
      ),
    },
    {
      key: "active",
      label: "Status",
      render: (row: Subcategory) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.active
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {row.active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Subcategory Management
            </h1>
            <p className="text-white/60">
              Manage ticket subcategories organized by category
            </p>
          </div>
          <Button onClick={openCreateForm}>
            + New Subcategory
          </Button>
        </div>

        {/* Category Filter */}
        <div className="mb-6 max-w-md">
          <FormField
            label="Filter by Category"
            type="select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </FormField>
        </div>

        {/* Data List */}
        {selectedCategory ? (
          <DataTable
            columns={columns}
            data={subcategories}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            actions={(row) => (
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => openEditForm(row)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(row)}
                >
                  Delete
                </Button>
              </div>
            )}
            emptyMessage="No subcategories found for this category."
          />
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/60">
              Please select a category to view its subcategories.
            </p>
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={formVisible}
          title={activeSubcategoryId ? "Edit Subcategory" : "New Subcategory"}
          onClose={closeForm}
        >
            <div className="space-y-6">
              {formErrors.general && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                  {formErrors.general}
                </div>
              )}

              {/* Category Selector */}
              <FormField
                label="Category"
                type="select"
                value={formValues.categoryId}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, categoryId: e.target.value }))
                }
                error={formErrors.categoryId}
                required
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </FormField>

              {/* Name */}
              <FormField
                label="Subcategory Name"
                type="text"
                placeholder="e.g., Hardware Issues, Login Problems"
                value={formValues.name}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, name: e.target.value }))
                }
                error={formErrors.name}
                required
              />

              {/* Description */}
              <FormField
                label="Description"
                type="textarea"
                placeholder="Optional description..."
                value={formValues.description}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />

              {/* Active Toggle (only for edit) */}
              {activeSubcategoryId && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formValues.active}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        active: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-blue focus:ring-primary-blue focus:ring-offset-0"
                  />
                  <label htmlFor="active" className="text-sm text-white/90">
                    Active
                  </label>
                </div>
              )}
            </div>

            <ModalActions>
              <Button variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createSubcategoryMutation.isPending ||
                  updateSubcategoryMutation.isPending
                }
              >
                {activeSubcategoryId ? "Update" : "Create"}
              </Button>
            </ModalActions>
        </Modal>
      </div>
    </div>
  );
}
