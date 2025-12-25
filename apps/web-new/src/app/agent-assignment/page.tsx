"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Agent Assignment Designer
          </h1>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Assignment
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {formMode === "create" ? "Create" : "Edit"} Agent Assignment
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {formErrors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.categoryId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subcategory (Optional)
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Agent *
                </label>
                <select
                  value={formValues.agentId}
                  onChange={(e) => {
                    setFormValues({ ...formValues, agentId: e.target.value });
                    setFormErrors({ ...formErrors, agentId: undefined });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
                {formErrors.agentId && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.agentId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority (Optional)
                </label>
                <select
                  value={formValues.priority}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      priority: e.target.value as FormValues["priority"],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Any priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formValues.active}
                  onChange={(e) =>
                    setFormValues({ ...formValues, active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="active"
                  className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formMode === "create" ? "Create" : "Update"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subcategory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No agent assignments found. Create one to get started.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assignment.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assignment.subcategory?.name || (
                        <span className="text-gray-400">Any</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assignment.agent.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assignment.priority ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            assignment.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : assignment.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {assignment.priority}
                        </span>
                      ) : (
                        <span className="text-gray-400">Any</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          assignment.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {assignment.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="text-red-600 hover:text-red-900"
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
  );
}
