"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { CrudModal } from "@/components/CrudModal";
import {
  fetchAgentAssignments,
  createAgentAssignment,
  updateAgentAssignment,
  deleteAgentAssignment,
  type AgentAssignment,
  type CreateAgentAssignmentPayload,
  type UpdateAgentAssignmentPayload,
} from "@/services/agentAssignments";
import { fetchCategories, fetchSubcategories } from "@/services/categories";
import { fetchUsers } from "@/services/users";

type FormMode = "create" | "edit";

type FormValues = {
  categoryId: string;
  subcategoryId: string;
  agentId: string;
  priority: "low" | "medium" | "high" | "";
  active: boolean;
};

type FormErrors = {
  categoryId?: string;
  subcategoryId?: string;
  agentId?: string;
};

const makeEmptyForm = (): FormValues => ({
  categoryId: "",
  subcategoryId: "",
  agentId: "",
  priority: "",
  active: true,
});

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.categoryId) {
    errors.categoryId = "Category is required";
  }
  if (!values.agentId) {
    errors.agentId = "Agent is required";
  }
  return errors;
}

export default function AgentAssignmentPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formValues, setFormValues] = useState<FormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Redirect if not admin
  if (user?.role !== "admin") {
    router.push("/");
    return null;
  }

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["agentAssignments"],
    queryFn: () => fetchAgentAssignments(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(false),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", formValues.categoryId],
    queryFn: () =>
      formValues.categoryId
        ? fetchSubcategories(formValues.categoryId, false)
        : Promise.resolve([]),
    enabled: !!formValues.categoryId,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: async () => {
      const allUsers = await fetchUsers();
      return allUsers.filter(
        (u) => u.role === "agent" || u.role === "admin",
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: createAgentAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentAssignments"] });
      setShowForm(false);
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
      payload: UpdateAgentAssignmentPayload;
    }) => updateAgentAssignment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentAssignments"] });
      setShowForm(false);
      setFormValues(makeEmptyForm());
      setFormErrors({});
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgentAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentAssignments"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload: CreateAgentAssignmentPayload = {
      categoryId: formValues.categoryId,
      subcategoryId: formValues.subcategoryId || null,
      agentId: formValues.agentId,
      priority: formValues.priority || null,
      active: formValues.active,
    };

    if (formMode === "create") {
      createMutation.mutate(payload);
    } else if (editingId) {
      const updatePayload: UpdateAgentAssignmentPayload = {
        agentId: formValues.agentId,
        priority: formValues.priority || null,
        active: formValues.active,
      };
      updateMutation.mutate({ id: editingId, payload: updatePayload });
    }
  };

  const handleEdit = (assignment: AgentAssignment) => {
    setFormMode("edit");
    setEditingId(assignment.id);
    setFormValues({
      categoryId: assignment.categoryId,
      subcategoryId: assignment.subcategoryId || "",
      agentId: assignment.agentId,
      priority: assignment.priority || "",
      active: assignment.active,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this assignment?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    setFormMode("create");
    setEditingId(null);
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">
            Agent Assignment
          </h1>
          <button
            onClick={() => router.push("/tickets")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Back to Tickets
          </button>
        </div>

        {!showForm && (
          <div className="mb-6">
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Assignment
            </button>
          </div>
        )}

        {showForm && (
          <CrudModal
            title={formMode === "create" ? "Create Agent Assignment" : "Edit Agent Assignment"}
            onClose={handleCancel}
            onSubmit={handleSubmit}
            submitLabel={formMode === "create" ? "Create" : "Update"}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            formId="agent-assignment-form"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formValues.categoryId}
                onChange={(e) => {
                  setFormValues({
                    ...formValues,
                    categoryId: e.target.value,
                    subcategoryId: "",
                  });
                  setFormErrors({ ...formErrors, categoryId: undefined });
                }}
                disabled={formMode === "edit"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.categoryId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <select
                value={formValues.subcategoryId}
                onChange={(e) => {
                  setFormValues({
                    ...formValues,
                    subcategoryId: e.target.value,
                  });
                }}
                disabled={!formValues.categoryId || formMode === "edit"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
              >
                <option value="">Any subcategory</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent *
              </label>
              <select
                value={formValues.agentId}
                onChange={(e) => {
                  setFormValues({ ...formValues, agentId: e.target.value });
                  setFormErrors({ ...formErrors, agentId: undefined });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.email})
                  </option>
                ))}
              </select>
              {formErrors.agentId && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.agentId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formValues.priority}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    priority: e.target.value as FormValues["priority"],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center md:col-span-2">
              <input
                type="checkbox"
                id="active"
                checked={formValues.active}
                onChange={(e) =>
                  setFormValues({ ...formValues, active: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </CrudModal>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Agent Assignments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Subcategory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-slate-400"
                    >
                      No agent assignments found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {assignment.category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {assignment.subcategory?.name || (
                          <span className="text-slate-400">Any</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {assignment.agent.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {assignment.priority ? (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              assignment.priority === "high"
                                ? "bg-red-600/20 text-red-400"
                                : assignment.priority === "medium"
                                  ? "bg-yellow-600/20 text-yellow-400"
                                  : "bg-green-600/20 text-green-400"
                            }`}
                          >
                            {assignment.priority}
                          </span>
                        ) : (
                          <span className="text-slate-400">Any</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            assignment.active
                              ? "bg-green-600/20 text-green-400"
                              : "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {assignment.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
