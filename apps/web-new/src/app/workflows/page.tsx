"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { workflowsService, type Workflow, type WorkflowStep, type Role } from "@/services/workflows";
import { categoriesService } from "@/services/categories";
import { subcategoriesService } from "@/services/subcategories";
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField, FormSelect } from "@/components/FormField";
import { Button } from "@/components/Button";

type WorkflowFormValues = {
  name: string;
  description: string;
  roleFilter: Role | "";
  categoryId: string;
  subcategoryId: string;
  isDefault: boolean;
  active: boolean;
  steps: StepFormValue[];
};

type StepFormValue = {
  tempId: string;
  name: string;
  description: string;
  order: number;
  requiredRole: Role | "";
};

type FormErrors = Record<string, string>;

const makeEmptyForm = (): WorkflowFormValues => ({
  name: "",
  description: "",
  roleFilter: "",
  categoryId: "",
  subcategoryId: "",
  isDefault: false,
  active: true,
  steps: [
    { tempId: "step-0", name: "", description: "", order: 0, requiredRole: "" }
  ],
});

export default function WorkflowsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const toastAdd = useToastStore((s) => s.addNotification);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<WorkflowFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  const {
    data: workflows,
    isLoading: workflowsLoading,
    isRefetching: workflowsRefetching,
    refetch: refetchWorkflows,
    error: workflowsError,
  } = useQuery({
    queryKey: ["admin", "workflows"],
    queryFn: workflowsService.listAllWorkflows,
    enabled: user?.role === "admin",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: categoriesService.listAllCategories,
    enabled: user?.role === "admin",
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["admin", "subcategories", formValues.categoryId],
    queryFn: () =>
      formValues.categoryId
        ? subcategoriesService.listByCategory(formValues.categoryId)
        : Promise.resolve([]),
    enabled: user?.role === "admin" && !!formValues.categoryId,
  });

  const refreshing = workflowsRefetching;
  const workflowList = workflows ?? [];

  const handleRefresh = () => {
    refetchWorkflows();
  };

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveWorkflowId(null);
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

  const openEditForm = (workflow: Workflow) => {
    setFormMode("edit");
    setActiveWorkflowId(workflow.id);
    setFormErrors({});
    setFormValues({
      name: workflow.name,
      description: workflow.description ?? "",
      roleFilter: workflow.roleFilter ?? "",
      categoryId: workflow.categoryId ?? "",
      subcategoryId: workflow.subcategoryId ?? "",
      isDefault: workflow.isDefault,
      active: workflow.active,
      steps: workflow.steps.map((step, idx) => ({
        tempId: `step-${idx}`,
        name: step.name,
        description: step.description ?? "",
        order: step.order,
        requiredRole: step.requiredRole ?? "",
      })),
    });
    setFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save workflow.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateWorkflows = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
  };

  const createWorkflowMutation = useMutation({
    mutationFn: workflowsService.createWorkflow,
    onSuccess: (created) => {
      invalidateWorkflows();
      closeForm();
      toastAdd({
        type: "success",
        title: "Workflow created",
        message: `Workflow "${created.name}" created successfully`,
        timestamp: new Date().toISOString(),
      });
    },
    onError: handleMutationError,
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: ({
      workflowId,
      data,
    }: {
      workflowId: string;
      data: Parameters<typeof workflowsService.updateWorkflow>[1];
    }) => workflowsService.updateWorkflow(workflowId, data),
    onSuccess: (updated) => {
      invalidateWorkflows();
      closeForm();
      toastAdd({
        type: "success",
        title: "Workflow updated",
        message: `Workflow "${updated.name}" updated successfully`,
        timestamp: new Date().toISOString(),
      });
    },
    onError: handleMutationError,
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: workflowsService.deleteWorkflow,
    onMutate: (workflowId) => {
      setPendingDeleteId(workflowId);
    },
    onSuccess: (removed) => {
      invalidateWorkflows();
      toastAdd({
        type: "success",
        title: "Workflow deleted",
        message: `Workflow "${removed.name}" deleted`,
        timestamp: new Date().toISOString(),
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete workflow.";
      toastAdd({
        type: "error",
        title: "Delete failed",
        message,
        timestamp: new Date().toISOString(),
      });
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const addStep = () => {
    const nextOrder = formValues.steps.length;
    setFormValues((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          tempId: `step-${Date.now()}`,
          name: "",
          description: "",
          order: nextOrder,
          requiredRole: "",
        },
      ],
    }));
  };

  const removeStep = (tempId: string) => {
    setFormValues((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((s) => s.tempId !== tempId)
        .map((s, idx) => ({ ...s, order: idx })),
    }));
  };

  const updateStep = (tempId: string, field: keyof StepFormValue, value: string | number) => {
    setFormValues((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.tempId === tempId ? { ...s, [field]: value } : s
      ),
    }));
  };

  const moveStepUp = (tempId: string) => {
    setFormValues((prev) => {
      const idx = prev.steps.findIndex((s) => s.tempId === tempId);
      if (idx <= 0) return prev;
      const steps = [...prev.steps];
      [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]];
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, order: i })),
      };
    });
  };

  const moveStepDown = (tempId: string) => {
    setFormValues((prev) => {
      const idx = prev.steps.findIndex((s) => s.tempId === tempId);
      if (idx < 0 || idx >= prev.steps.length - 1) return prev;
      const steps = [...prev.steps];
      [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]];
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, order: i })),
      };
    });
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formValues.name.trim()) {
      errors.name = "Name is required";
    }

    if (formValues.steps.length === 0) {
      errors.steps = "At least one workflow step is required";
    }

    formValues.steps.forEach((step, idx) => {
      if (!step.name.trim()) {
        errors[`step-${idx}-name`] = "Step name is required";
      }
    });

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
      roleFilter: formValues.roleFilter || undefined,
      categoryId: formValues.categoryId || undefined,
      subcategoryId: formValues.subcategoryId || undefined,
      isDefault: formValues.isDefault,
      active: formValues.active,
      steps: formValues.steps.map((step) => ({
        name: step.name.trim(),
        description: step.description.trim() || undefined,
        order: step.order,
        requiredRole: step.requiredRole || undefined,
      })),
    };

    if (formMode === "create") {
      createWorkflowMutation.mutate(payload as Parameters<typeof workflowsService.createWorkflow>[0]);
      return;
    }

    if (!activeWorkflowId) {
      return;
    }

    updateWorkflowMutation.mutate({ workflowId: activeWorkflowId, data: payload });
  };

  const confirmRemove = (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setConfirmDeleteVisible(true);
  };

  const handleConfirmDelete = () => {
    if (workflowToDelete) {
      deleteWorkflowMutation.mutate(workflowToDelete.id);
      setConfirmDeleteVisible(false);
      setWorkflowToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteVisible(false);
    setWorkflowToDelete(null);
  };

  const saving =
    createWorkflowMutation.isPending || updateWorkflowMutation.isPending;
  const workflowsInitialLoading = workflowsLoading && !workflows;
  const workflowsErrorMessage =
    workflowsError instanceof Error
      ? workflowsError.message
      : "Unable to load workflows.";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/80 mb-6">
            You need admin access to manage workflows.
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
              <h1 className="text-3xl font-bold text-white">Ticket Workflows</h1>
              <p className="text-white/70 mt-2">
                Define ticket lifecycles with custom workflow steps
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

        {/* Workflows List */}
        <div className="card rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Workflows
              </h2>
              <p className="text-white/70 mt-1">
                {workflowList.length} workflow{workflowList.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="secondary" onClick={openCreateForm}>
              Add Workflow
            </Button>
          </div>

          {workflowsError ? (
            <div className="card rounded-lg p-6">
              <p className="text-white/80">{workflowsErrorMessage}</p>
            </div>
          ) : (
            <DataList
              data={workflowList}
              getRowKey={(entry) => entry.id}
              isLoading={workflowsInitialLoading}
              emptyMessage="No workflows yet. Create one to get started."
              renderItem={(workflow) => (
                <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-white">{workflow.name}</p>
                      {workflow.isDefault && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/70">
                      {workflow.description || "No description"}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      {workflow.steps.length} step{workflow.steps.length === 1 ? "" : "s"}
                      {workflow.roleFilter && ` • Role: ${workflow.roleFilter}`}
                      {workflow.categoryId && " • Category filtered"}
                      {workflow.subcategoryId && " • Subcategory filtered"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        workflow.active
                          ? "bg-green-500/15 text-green-400 border border-green-500/20"
                          : "bg-white/5 text-white/70 border border-white/10"
                      }`}
                    >
                      {workflow.active ? "Active" : "Inactive"}
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(workflow)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmRemove(workflow)}
                        isLoading={pendingDeleteId === workflow.id}
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

      {/* Workflow Form Modal */}
      <Modal
        isOpen={formVisible}
        onClose={closeForm}
        title={
          formMode === "create"
            ? "Create Workflow"
            : "Edit Workflow"
        }
        size="lg"
      >
        <p className="text-white/80 mb-6">
          {formMode === "create"
            ? "Create a new workflow for ticket lifecycle management."
            : "Update workflow details and steps."}
        </p>

        <FormField
          label="Workflow Name"
          type="text"
          placeholder="e.g., IT Support Workflow"
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
          placeholder="Optional description for this workflow"
          value={formValues.description}
          onChange={(e) =>
            setFormValues((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FormSelect
            label="Role Filter (Optional)"
            value={formValues.roleFilter}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, roleFilter: e.target.value as Role | "" }))
            }
            options={[
              { value: "", label: "All Roles" },
              { value: "user", label: "User" },
              { value: "agent", label: "Agent" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <FormSelect
            label="Category Filter (Optional)"
            value={formValues.categoryId}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                categoryId: e.target.value,
                subcategoryId: "",
              }))
            }
            options={[
              { value: "", label: "All Categories" },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
          />

          <FormSelect
            label="Subcategory Filter (Optional)"
            value={formValues.subcategoryId}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                subcategoryId: e.target.value,
              }))
            }
            options={[
              { value: "", label: "All Subcategories" },
              ...subcategories.map((sub) => ({ value: sub.id, label: sub.name })),
            ]}
            disabled={!formValues.categoryId}
          />
        </div>

        {/* Checkboxes */}
        <div className="flex items-center space-x-6 mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formValues.isDefault}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  isDefault: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-white/30"
            />
            <span className="text-white/90">Default Workflow</span>
          </label>

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

        {/* Workflow Steps */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-white/90">
              Workflow Steps <span className="text-red-400 ml-1">*</span>
            </label>
            <Button variant="ghost" size="sm" onClick={addStep}>
              + Add Step
            </Button>
          </div>

          {formErrors.steps && (
            <p className="text-red-400 text-sm mb-2">{formErrors.steps}</p>
          )}

          <div className="space-y-3">
            {formValues.steps.map((step, idx) => (
              <div key={step.tempId} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-white/70 font-medium">Step {idx + 1}</span>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => moveStepUp(step.tempId)}
                        disabled={idx === 0}
                        className="p-1 text-white/50 hover:text-white disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStepDown(step.tempId)}
                        disabled={idx === formValues.steps.length - 1}
                        className="p-1 text-white/50 hover:text-white disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(step.tempId)}
                    disabled={formValues.steps.length === 1}
                  >
                    Remove
                  </Button>
                </div>

                <div className="space-y-3">
                  <FormField
                    label="Step Name"
                    type="text"
                    placeholder="e.g., Initial Review"
                    value={step.name}
                    onChange={(e) => updateStep(step.tempId, "name", e.target.value)}
                    error={formErrors[`step-${idx}-name`]}
                    required
                  />

                  <FormField
                    label="Description (Optional)"
                    type="text"
                    placeholder="Step description..."
                    value={step.description}
                    onChange={(e) =>
                      updateStep(step.tempId, "description", e.target.value)
                    }
                  />

                  <FormSelect
                    label="Required Role (Optional)"
                    value={step.requiredRole}
                    onChange={(e) =>
                      updateStep(step.tempId, "requiredRole", e.target.value)
                    }
                    options={[
                      { value: "", label: "Any Role" },
                      { value: "agent", label: "Agent" },
                      { value: "admin", label: "Admin" },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
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
            {formMode === "create" ? "Create Workflow" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={confirmDeleteVisible}
        onClose={handleCancelDelete}
        title="Confirm Delete"
        size="sm"
      >
        <p className="text-white/80 mb-6">
          Are you sure you want to delete the workflow &quot;{workflowToDelete?.name}&quot;? This action cannot be undone.
        </p>

        <ModalActions>
          <Button variant="ghost" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            isLoading={deleteWorkflowMutation.isPending}
          >
            Delete Workflow
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
