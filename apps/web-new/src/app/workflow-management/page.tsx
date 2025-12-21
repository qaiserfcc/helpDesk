"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import {
  fetchWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  fetchWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  type WorkflowDefinition,
  type WorkflowStep,
  type CreateWorkflowPayload,
  type UpdateWorkflowPayload,
  type CreateWorkflowStepPayload,
  type UpdateWorkflowStepPayload,
} from "@/services/workflows";
import { fetchCategories, type Category } from "@/services/categories";

export default function WorkflowManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore((state) => ({ session: state.session }));

  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showStepForm, setShowStepForm] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);

  const [workflowFormData, setWorkflowFormData] = useState<CreateWorkflowPayload>({
    name: "",
    description: "",
    categoryId: undefined,
    version: 1,
    active: true,
  });

  const [stepFormData, setStepFormData] = useState<CreateWorkflowStepPayload>({
    workflowId: "",
    name: "",
    description: "",
    order: 1,
    initiatorRole: "",
    allowedActions: null,
    conditions: null,
  });

  // Check admin access
  React.useEffect(() => {
    if (!session?.user || session.user.role !== "admin") {
      router.push("/");
    }
  }, [session, router]);

  const { data: workflows, isLoading: loadingWorkflows } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: steps, isLoading: loadingSteps } = useQuery({
    queryKey: ["workflow-steps", selectedWorkflowId],
    queryFn: () => fetchWorkflowSteps(selectedWorkflowId!),
    enabled: !!selectedWorkflowId,
  });

  const createMutation = useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setShowWorkflowForm(false);
      resetWorkflowForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkflowPayload }) =>
      updateWorkflow(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setShowWorkflowForm(false);
      setEditingWorkflow(null);
      resetWorkflowForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setShowDeleteModal(false);
      setWorkflowToDelete(null);
      if (selectedWorkflowId === workflowToDelete) {
        setSelectedWorkflowId(null);
      }
    },
  });

  const createStepMutation = useMutation({
    mutationFn: createWorkflowStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-steps", selectedWorkflowId] });
      setShowStepForm(false);
      resetStepForm();
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkflowStepPayload }) =>
      updateWorkflowStep(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-steps", selectedWorkflowId] });
      setShowStepForm(false);
      setEditingStep(null);
      resetStepForm();
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: deleteWorkflowStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-steps", selectedWorkflowId] });
      setShowDeleteModal(false);
      setStepToDelete(null);
    },
  });

  const resetWorkflowForm = () => {
    setWorkflowFormData({
      name: "",
      description: "",
      categoryId: undefined,
      version: 1,
      active: true,
    });
  };

  const resetStepForm = () => {
    setStepFormData({
      workflowId: selectedWorkflowId || "",
      name: "",
      description: "",
      order: (steps?.length || 0) + 1,
      initiatorRole: "",
      allowedActions: null,
      conditions: null,
    });
  };

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    resetWorkflowForm();
    setShowWorkflowForm(true);
  };

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setEditingWorkflow(workflow);
    setWorkflowFormData({
      name: workflow.name,
      description: workflow.description || "",
      categoryId: workflow.categoryId || undefined,
      version: workflow.version,
      active: workflow.active,
    });
    setShowWorkflowForm(true);
  };

  const handleSubmitWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorkflow) {
      updateMutation.mutate({ id: editingWorkflow.id, payload: workflowFormData });
    } else {
      createMutation.mutate(workflowFormData);
    }
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflowToDelete(workflowId);
    setStepToDelete(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (workflowToDelete) {
      deleteMutation.mutate(workflowToDelete);
    } else if (stepToDelete) {
      deleteStepMutation.mutate(stepToDelete);
    }
  };

  const handleCreateStep = () => {
    if (!selectedWorkflowId) return;
    setEditingStep(null);
    resetStepForm();
    setShowStepForm(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepFormData({
      workflowId: step.workflowId,
      name: step.name,
      description: step.description || "",
      order: step.order,
      initiatorRole: step.initiatorRole || "",
      allowedActions: step.allowedActions,
      conditions: step.conditions,
    });
    setShowStepForm(true);
  };

  const handleSubmitStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStep) {
      updateStepMutation.mutate({ id: editingStep.id, payload: stepFormData });
    } else {
      createStepMutation.mutate(stepFormData);
    }
  };

  const handleDeleteStep = (stepId: string) => {
    setStepToDelete(stepId);
    setWorkflowToDelete(null);
    setShowDeleteModal(true);
  };

  const selectedWorkflow = workflows?.find((w) => w.id === selectedWorkflowId);

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Workflow Management</h1>
          <button
            onClick={handleCreateWorkflow}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            + Create Workflow
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Workflows List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Workflows</h2>
            {loadingWorkflows ? (
              <p className="text-white/70">Loading workflows...</p>
            ) : workflows && workflows.length > 0 ? (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={`bg-white/20 backdrop-blur rounded-lg p-4 cursor-pointer hover:bg-white/30 transition ${
                      selectedWorkflowId === workflow.id ? "ring-2 ring-white" : ""
                    }`}
                    onClick={() => setSelectedWorkflowId(workflow.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{workflow.name}</h3>
                        {workflow.description && (
                          <p className="text-white/70 text-sm mt-1">{workflow.description}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          workflow.active ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                        }`}
                      >
                        {workflow.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-white/70 text-sm">Version {workflow.version}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditWorkflow(workflow);
                          }}
                          className="text-white hover:text-blue-200 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id);
                          }}
                          className="text-red-300 hover:text-red-100 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No workflows yet. Create one to get started!</p>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                {selectedWorkflow ? `${selectedWorkflow.name} - Steps` : "Select a Workflow"}
              </h2>
              {selectedWorkflowId && (
                <button
                  onClick={handleCreateStep}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
                >
                  + Add Step
                </button>
              )}
            </div>
            {!selectedWorkflowId ? (
              <p className="text-white/70">Select a workflow to view and manage its steps.</p>
            ) : loadingSteps ? (
              <p className="text-white/70">Loading steps...</p>
            ) : steps && steps.length > 0 ? (
              <div className="space-y-3">
                {steps
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <div key={step.id} className="bg-white/20 backdrop-blur rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{step.name}</h3>
                          {step.description && (
                            <p className="text-white/70 text-sm mt-1">{step.description}</p>
                          )}
                          {step.initiatorRole && (
                            <p className="text-white/60 text-xs mt-2">
                              Initiator: <span className="font-semibold">{step.initiatorRole}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => handleEditStep(step)}
                          className="text-white hover:text-blue-200 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="text-red-300 hover:text-red-100 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-white/70">No steps yet. Add steps to define the workflow.</p>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Form Modal */}
      {showWorkflowForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingWorkflow ? "Edit Workflow" : "Create Workflow"}
            </h2>
            <form onSubmit={handleSubmitWorkflow}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={workflowFormData.name}
                    onChange={(e) =>
                      setWorkflowFormData({ ...workflowFormData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={workflowFormData.description}
                    onChange={(e) =>
                      setWorkflowFormData({ ...workflowFormData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={workflowFormData.categoryId || ""}
                    onChange={(e) =>
                      setWorkflowFormData({
                        ...workflowFormData,
                        categoryId: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">No category</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="number"
                    min="1"
                    value={workflowFormData.version}
                    onChange={(e) =>
                      setWorkflowFormData({
                        ...workflowFormData,
                        version: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={workflowFormData.active}
                    onChange={(e) =>
                      setWorkflowFormData({ ...workflowFormData, active: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkflowForm(false);
                    setEditingWorkflow(null);
                    resetWorkflowForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingWorkflow ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step Form Modal */}
      {showStepForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">{editingStep ? "Edit Step" : "Add Step"}</h2>
            <form onSubmit={handleSubmitStep}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={stepFormData.name}
                    onChange={(e) => setStepFormData({ ...stepFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={stepFormData.description}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stepFormData.order}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, order: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initiator Role
                  </label>
                  <select
                    value={stepFormData.initiatorRole}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, initiatorRole: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Any</option>
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowStepForm(false);
                    setEditingStep(null);
                    resetStepForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingStep ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this {workflowToDelete ? "workflow" : "step"}? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWorkflowToDelete(null);
                  setStepToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
