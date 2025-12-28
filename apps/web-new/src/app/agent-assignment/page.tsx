"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  autoAssignService,
  type AutoAssignment,
} from "@/services/autoAssign";
import {
  subcategoriesService,
  type Subcategory,
} from "@/services/subcategories";
import {
  categoriesService,
  type Category,
} from "@/services/categories";
import { fetchUsers, type UserSummary } from "@/services/users";
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

type AutoAssignFormValues = {
  categoryId: string;
  subcategoryId: string;
  agentId: string;
  priority: number;
  active: boolean;
};

type FormErrors = Record<string, string>;

const makeEmptyForm = (): AutoAssignFormValues => ({
  categoryId: "",
  subcategoryId: "",
  agentId: "",
  priority: 0,
  active: true,
});

export default function AgentAssignmentPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<AutoAssignFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isRefetching: assignmentsRefetching,
    refetch: refetchAssignments,
    error: assignmentsError,
  } = useQuery({
    queryKey: ["admin", "auto-assign"],
    queryFn: autoAssignService.listAutoAssignments,
    enabled: user?.role === "admin",
  });

  const {
    data: categories = [],
  } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => categoriesService.listAllCategories(),
    enabled: user?.role === "admin",
  });

  const {
    data: subcategories = [],
  } = useQuery({
    queryKey: ["admin", "subcategories", formValues.categoryId],
    queryFn: () =>
      formValues.categoryId
        ? subcategoriesService.listByCategory(formValues.categoryId)
        : Promise.resolve([]),
    enabled: formVisible && !!formValues.categoryId,
  });

  const {
    data: agents,
  } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: () => fetchUsers({ role: "agent" }),
    enabled: formVisible && user?.role === "admin",
  });

  const refreshing = assignmentsRefetching;
  const assignmentList = assignments ?? [];

  const handleRefresh = () => {
    refetchAssignments();
  };

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveAssignmentId(null);
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

  const openEditForm = (entry: AutoAssignment) => {
    setFormMode("edit");
    setActiveAssignmentId(entry.id);
    setFormErrors({});
    const subcategory = entry.subcategory;
    const categoryId = subcategory?.categoryId || "";
    const { subcategoryId, agentId, priority, active } = entry;
    setFormValues({ categoryId, subcategoryId, agentId, priority, active });
    setFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save assignment.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateAssignments = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "auto-assign"] });
  };

  const createAssignmentMutation = useMutation({
    mutationFn: autoAssignService.createAutoAssignment,
    onSuccess: (created) => {
      invalidateAssignments();
      closeForm();
      alert(`Assignment created successfully.`);
    },
    onError: handleMutationError,
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: Partial<AutoAssignFormValues>;
    }) => autoAssignService.updateAutoAssignment(assignmentId, data),
    onSuccess: (updated) => {
      invalidateAssignments();
      closeForm();
      alert(`Assignment updated successfully.`);
    },
    onError: handleMutationError,
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: autoAssignService.deleteAutoAssignment,
    onMutate: (assignmentId) => {
      setPendingDeleteId(assignmentId);
    },
    onSuccess: () => {
      invalidateAssignments();
      alert(`Assignment deleted.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete assignment.";
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

    if (!formValues.agentId) {
      errors.agentId = "Agent is required";
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
      agentId: formValues.agentId,
      priority: formValues.priority,
      active: formValues.active,
    };

    if (formMode === "create") {
      createAssignmentMutation.mutate(payload);
      return;
    }

    if (!activeAssignmentId) {
      return;
    }

    updateAssignmentMutation.mutate({ assignmentId: activeAssignmentId, data: payload });
  };

  const confirmRemove = (entry: AutoAssignment) => {
    if (confirm(`Remove assignment for ${entry.agent?.name || "this agent"}?`)) {
      deleteAssignmentMutation.mutate(entry.id);
    }
  };

  const saving =
    createAssignmentMutation.isPending || updateAssignmentMutation.isPending;
  const assignmentsInitialLoading = assignmentsLoading && !assignments;
  const assignmentsErrorMessage =
    assignmentsError instanceof Error
      ? assignmentsError.message
      : "Unable to load assignments.";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/80 mb-6">
            You need admin access to manage agent assignments.
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
              <h1 className="text-3xl font-bold text-white">Agent Auto-Assignment</h1>
              <p className="text-white/70 mt-2">
                Automatically assign tickets to agents based on subcategory
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

        {/* Assignments List */}
        <div className="card rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Agent Assignments
              </h2>
              <p className="text-white/70 mt-1">
                {assignmentList.length} assignment{assignmentList.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="secondary" onClick={openCreateForm}>
              Add Assignment
            </Button>
          </div>

          {/* Assignments List */}
          {assignmentsError ? (
            <div className="card rounded-lg p-6">
              <p className="text-white/80">{assignmentsErrorMessage}</p>
            </div>
          ) : (
            <DataList
              data={assignmentList}
              getRowKey={(entry) => entry.id}
              isLoading={assignmentsInitialLoading}
              emptyMessage="No assignments yet. Create one to get started."
              renderItem={(entry) => (
                <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {entry.agent?.name || "Unknown Agent"}
                    </p>
                    <p className="text-sm text-white/70">
                      {entry.subcategory?.name || "Unknown Subcategory"} •
                      Priority: {entry.priority}
                    </p>
                    {entry.agent?.email && (
                      <p className="text-xs text-white/60 mt-1">{entry.agent.email}</p>
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

      {/* Assignment Form Modal */}
      <Modal
        isOpen={formVisible}
        onClose={closeForm}
        title={
          formMode === "create"
            ? "Create Agent Assignment"
            : "Edit Agent Assignment"
        }
        size="md"
      >
        <p className="text-white/80 mb-6">
          {formMode === "create"
            ? "Assign an agent to handle tickets from a specific subcategory."
            : "Update agent assignment details."}
        </p>

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

        {/* Agent Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-2">
            Agent <span className="text-red-400 ml-1">*</span>
          </label>
          <select
            value={formValues.agentId}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                agentId: e.target.value,
              }))
            }
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-blue/50 focus:bg-white/10"
          >
            <option value="">Select an agent</option>
            {agents?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.email})
              </option>
            ))}
          </select>
          {formErrors.agentId && (
            <p className="text-red-400 text-sm mt-1">{formErrors.agentId}</p>
          )}
        </div>

        <FormField
          label="Priority (0 = highest)"
          type="number"
          value={formValues.priority.toString()}
          onChange={(e) =>
            setFormValues((prev) => ({
              ...prev,
              priority: parseInt(e.target.value, 10),
            }))
          }
          helperText="Lower numbers have higher priority"
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
            {formMode === "create" ? "Create Assignment" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
