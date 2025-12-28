"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  slasService,
  type Sla,
} from "@/services/slas";
import {
  subcategoriesService,
  type Subcategory,
} from "@/services/subcategories";
import {
  categoriesService,
  type Category,
} from "@/services/categories";
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

type SlaFormValues = {
  categoryId: string;
  subcategoryId: string;
  name: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  priority: "low" | "medium" | "high";
  description: string;
  active: boolean;
};

type FormErrors = Record<string, string>;

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

const makeEmptyForm = (): SlaFormValues => ({
  categoryId: "",
  subcategoryId: "",
  name: "",
  responseTimeHours: 4,
  resolutionTimeHours: 24,
  priority: "medium",
  description: "",
  active: true,
});

export default function SlasPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<SlaFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeSlaId, setActiveSlaId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: slas,
    isLoading: slasLoading,
    isRefetching: slasRefetching,
    refetch: refetchSlas,
    error: slasError,
  } = useQuery({
    queryKey: ["admin", "slas"],
    queryFn: slasService.listSlas,
    enabled: user?.role === "admin",
  });

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => categoriesService.listAllCategories(),
    enabled: user?.role === "admin",
  });

  // Fetch subcategories for selected category
  const { data: subcategories = [] } = useQuery({
    queryKey: ["admin", "subcategories", formValues.categoryId],
    queryFn: () =>
      formValues.categoryId
        ? subcategoriesService.listByCategory(formValues.categoryId)
        : Promise.resolve([]),
    enabled: formVisible && !!formValues.categoryId,
  });

  const refreshing = slasRefetching;
  const slaList = slas ?? [];

  const handleRefresh = () => {
    refetchSlas();
  };

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveSlaId(null);
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

  const openEditForm = (entry: Sla) => {
    setFormMode("edit");
    setActiveSlaId(entry.id);
    setFormErrors({});
    
    // Find the category for this subcategory
    const subcategory = entry.subcategory;
    const categoryId = subcategory?.categoryId || "";
    
    setFormValues({
      categoryId: categoryId,
      subcategoryId: entry.subcategoryId,
      name: entry.name,
      responseTimeHours: entry.responseTimeHours,
      resolutionTimeHours: entry.resolutionTimeHours,
      priority: entry.priority,
      description: entry.description ?? "",
      active: entry.active,
    });
    setFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save SLA.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateSlas = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "slas"] });
  };

  const createSlaMutation = useMutation({
    mutationFn: slasService.createSla,
    onSuccess: (created) => {
      invalidateSlas();
      closeForm();
      alert(`SLA "${created.name}" created successfully.`);
    },
    onError: handleMutationError,
  });

  const updateSlaMutation = useMutation({
    mutationFn: ({
      slaId,
      data,
    }: {
      slaId: string;
      data: Partial<SlaFormValues>;
    }) => slasService.updateSla(slaId, data),
    onSuccess: (updated) => {
      invalidateSlas();
      closeForm();
      alert(`SLA "${updated.name}" updated successfully.`);
    },
    onError: handleMutationError,
  });

  const deleteSlaMutation = useMutation({
    mutationFn: slasService.deleteSla,
    onMutate: (slaId) => {
      setPendingDeleteId(slaId);
    },
    onSuccess: (removed) => {
      invalidateSlas();
      alert(`SLA "${removed.name}" deleted.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete SLA.";
      alert(`Delete failed: ${message}`);
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formValues.categoryId) {
      errors.categoryId = "Category is required";
    }

    if (!formValues.subcategoryId) {
      errors.subcategoryId = "Subcategory is required";
    }

    if (!formValues.name.trim()) {
      errors.name = "Name is required";
    }

    if (formValues.responseTimeHours <= 0) {
      errors.responseTimeHours = "Response time must be greater than 0";
    }

    if (formValues.resolutionTimeHours <= 0) {
      errors.resolutionTimeHours = "Resolution time must be greater than 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      subcategoryId: formValues.subcategoryId,
      name: formValues.name.trim(),
      responseTimeHours: formValues.responseTimeHours,
      resolutionTimeHours: formValues.resolutionTimeHours,
      priority: formValues.priority,
      description: formValues.description.trim() || undefined,
      active: formValues.active,
    };

    if (formMode === "create") {
      createSlaMutation.mutate(payload);
      return;
    }

    if (!activeSlaId) {
      return;
    }

    updateSlaMutation.mutate({ slaId: activeSlaId, data: payload });
  };

  const confirmRemove = (entry: Sla) => {
    if (confirm(`Delete SLA "${entry.name}"? This cannot be undone.`)) {
      deleteSlaMutation.mutate(entry.id);
    }
  };

  const saving =
    createSlaMutation.isPending || updateSlaMutation.isPending;
  const slasInitialLoading = slasLoading && !slas;
  const slasErrorMessage =
    slasError instanceof Error
      ? slasError.message
      : "Unable to load SLAs.";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/80 mb-6">
            You need admin access to manage SLAs.
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
              <h1 className="text-3xl font-bold text-white">Service Level Agreements</h1>
              <p className="text-white/70 mt-2">
                Define response and resolution times for each subcategory
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

        {/* SLAs List */}
        <div className="card rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                SLAs
              </h2>
              <p className="text-white/70 mt-1">
                {slaList.length} SLA{slaList.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="secondary" onClick={openCreateForm}>
              Add SLA
            </Button>
          </div>

          {/* SLAs List */}
          {slasError ? (
            <div className="card rounded-lg p-6">
              <p className="text-white/80">{slasErrorMessage}</p>
            </div>
          ) : (
            <DataList
              data={slaList}
              getRowKey={(entry) => entry.id}
              isLoading={slasInitialLoading}
              emptyMessage="No SLAs yet. Create one to get started."
              renderItem={(entry) => (
                <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-white">{entry.name}</p>
                    <p className="text-sm text-white/70">
                      {entry.subcategory?.name || "Unknown"} •{" "}
                      {entry.responseTimeHours}h response •{" "}
                      {entry.resolutionTimeHours}h resolution
                    </p>
                    {entry.description && (
                      <p className="text-xs text-white/60 mt-1">{entry.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-alpha-15 text-white border border-primary-alpha-20">
                      {priorityLabels[entry.priority]}
                    </span>
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

      {/* SLA Form Modal */}
      <Modal
        isOpen={formVisible}
        onClose={closeForm}
        title={
          formMode === "create"
            ? "Create SLA"
            : "Edit SLA"
        }
        size="md"
      >
        <p className="text-white/80 mb-6">
          {formMode === "create"
            ? "Create a new service level agreement."
            : "Update SLA details."}
        </p>

        <FormField
          label="SLA Name"
          type="text"
          placeholder="e.g., Standard Support"
          value={formValues.name}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, name: e.target.value }))
          }
          error={formErrors.name}
          required
        />

        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-2">
            Category <span className="text-red-400 ml-1">*</span>
          </label>
          <select
            value={formValues.categoryId}
            onChange={(e) => {
              const categoryId = e.target.value;
              setFormValues((prev) => ({
                ...prev,
                categoryId,
                subcategoryId: "", // Reset subcategory when category changes
              }));
            }}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-blue/50 focus:bg-white/10"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {formErrors.categoryId && (
            <p className="text-red-400 text-sm mt-1">{formErrors.categoryId}</p>
          )}
        </div>

        {/* Subcategory Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-2">
            Subcategory <span className="text-red-400 ml-1">*</span>
          </label>
          <select
            value={formValues.subcategoryId}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                subcategoryId: e.target.value,
              }))
            }
            disabled={!formValues.categoryId}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-blue/50 focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {formValues.categoryId ? "Select a subcategory" : "Select category first"}
            </option>
            {subcategories.map((subcat) => (
              <option key={subcat.id} value={subcat.id}>
                {subcat.name}
              </option>
            ))}
          </select>
          {formErrors.subcategoryId && (
            <p className="text-red-400 text-sm mt-1">{formErrors.subcategoryId}</p>
          )}
        </div>

        <FormField
          label="Response Time (hours)"
          type="number"
          value={formValues.responseTimeHours.toString()}
          onChange={(e) =>
            setFormValues((prev) => ({
              ...prev,
              responseTimeHours: parseInt(e.target.value, 10),
            }))
          }
          error={formErrors.responseTimeHours}
          required
        />

        <FormField
          label="Resolution Time (hours)"
          type="number"
          value={formValues.resolutionTimeHours.toString()}
          onChange={(e) =>
            setFormValues((prev) => ({
              ...prev,
              resolutionTimeHours: parseInt(e.target.value, 10),
            }))
          }
          error={formErrors.resolutionTimeHours}
          required
        />

        {/* Priority */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">
            Priority
          </label>
          <div className="space-y-2">
            {Object.entries(priorityLabels).map(([value, label]) => (
              <div
                key={value}
                onClick={() =>
                  setFormValues((prev) => ({
                    ...prev,
                    priority: value as "low" | "medium" | "high",
                  }))
                }
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formValues.priority === value
                    ? "border-primary-blue bg-primary-alpha-8"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <p
                  className={`font-medium ${
                    formValues.priority === value ? "text-white" : "text-white/90"
                  }`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <FormField
          label="Description"
          type="textarea"
          placeholder="Optional description"
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
            {formMode === "create" ? "Create SLA" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
