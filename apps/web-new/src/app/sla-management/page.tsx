"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Modal } from "@/components/Modal";
import {
  fetchSLAs,
  createSLA,
  updateSLA,
  deleteSLA,
  type SLA,
  type CreateSLAPayload,
  type UpdateSLAPayload,
  type TicketPriority,
} from "@/services/slas";
import {
  fetchCategories,
  fetchSubcategories,
  type Category,
  type Subcategory,
} from "@/services/categories";

type FormMode = "create" | "edit";

interface SLAFormValues {
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string | null;
  priority: TicketPriority | "";
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  active: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  priority?: string;
  responseTimeMinutes?: string;
  resolutionTimeMinutes?: string;
}

const makeEmptySLAForm = (): SLAFormValues => ({
  name: "",
  description: "",
  categoryId: "",
  subcategoryId: null,
  priority: "",
  responseTimeMinutes: 0,
  resolutionTimeMinutes: 0,
  active: true,
});

function validateSLAForm(values: SLAFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "SLA name is required";
  }
  if (values.name.length > 200) {
    errors.name = "SLA name must be 200 characters or less";
  }
  if (values.description.length > 500) {
    errors.description = "Description must be 500 characters or less";
  }
  if (!values.categoryId) {
    errors.categoryId = "Category is required";
  }
  if (!values.priority) {
    errors.priority = "Priority is required";
  }
  if (values.responseTimeMinutes <= 0) {
    errors.responseTimeMinutes = "Response time must be greater than 0";
  }
  if (values.resolutionTimeMinutes <= 0) {
    errors.resolutionTimeMinutes = "Resolution time must be greater than 0";
  }
  if (values.responseTimeMinutes >= values.resolutionTimeMinutes) {
    errors.responseTimeMinutes = "Response time must be less than resolution time";
  }
  return errors;
}

export default function SLAManagementPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formValues, setFormValues] = useState<SLAFormValues>(makeEmptySLAForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeSLAId, setActiveSLAId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedCategoryIdForFilter, setSelectedCategoryIdForFilter] = useState<string>("");

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(false),
  });

  const {
    data: subcategories = [],
  } = useQuery<Subcategory[]>({
    queryKey: ["subcategories"],
    queryFn: () => fetchSubcategories(undefined, false),
  });

  const {
    data: slas = [],
    isLoading: slasLoading,
    refetch,
  } = useQuery<SLA[]>({
    queryKey: ["slas", selectedCategoryIdForFilter],
    queryFn: () => fetchSLAs(selectedCategoryIdForFilter || undefined, false),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSLAPayload) => createSLA(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slas"] });
      setFormVisible(false);
      setFormValues(makeEmptySLAForm());
      setFormErrors({});
      setActiveSLAId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSLAPayload }) =>
      updateSLA(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slas"] });
      setFormVisible(false);
      setActiveSLAId(null);
      setFormValues(makeEmptySLAForm());
      setFormErrors({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSLA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slas"] });
      setPendingDeleteId(null);
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
          <p className="text-slate-400">Only administrators can manage SLAs.</p>
        </div>
      </div>
    );
  }

  function handleCreateClick() {
    setFormMode("create");
    setFormValues(makeEmptySLAForm());
    setFormErrors({});
    setActiveSLAId(null);
    setFormVisible(true);
  }

  function handleEditClick(sla: SLA) {
    setFormMode("edit");
    setFormValues({
      name: sla.name,
      description: sla.description || "",
      categoryId: sla.categoryId,
      subcategoryId: sla.subcategoryId || null,
      priority: sla.priority,
      responseTimeMinutes: sla.responseTimeMinutes,
      resolutionTimeMinutes: sla.resolutionTimeMinutes,
      active: sla.active,
    });
    setFormErrors({});
    setActiveSLAId(sla.id);
    setFormVisible(true);
  }

  function handleCancelClick() {
    setFormVisible(false);
    setActiveSLAId(null);
    setFormValues(makeEmptySLAForm());
    setFormErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateSLAForm(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      name: formValues.name,
      description: formValues.description || undefined,
      categoryId: formValues.categoryId,
      subcategoryId: formValues.subcategoryId,
      priority: formValues.priority as TicketPriority,
      responseTimeMinutes: formValues.responseTimeMinutes,
      resolutionTimeMinutes: formValues.resolutionTimeMinutes,
      active: formValues.active,
    };

    if (formMode === "create") {
      createMutation.mutate(payload as CreateSLAPayload);
    } else if (activeSLAId) {
      updateMutation.mutate({ id: activeSLAId, payload });
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

  const filteredSLAs = selectedCategoryIdForFilter
    ? slas.filter((s) => s.categoryId === selectedCategoryIdForFilter)
    : slas;

  // Get subcategories for selected category
  const categorySubcategories = formValues.categoryId
    ? subcategories.filter((s) => s.categoryId === formValues.categoryId)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">SLA Management</h1>
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
              Create SLA
            </button>
          </div>
        )}

        {/* Form Modal */}
        {formVisible && (
          <Modal
            title={formMode === "create" ? "Create SLA" : "Edit SLA"}
            onClose={handleCancelClick}
            maxWidthClass="max-w-3xl"
            actions={
              <button
                form="sla-form"
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
              >
                {formMode === "create" ? "Create" : "Update"}
              </button>
            }
          >
            <form id="sla-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    SLA Name *
                  </label>
                  <input
                    type="text"
                    value={formValues.name}
                    onChange={(e) =>
                      setFormValues({ ...formValues, name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="e.g., High Priority - Critical"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formValues.categoryId}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        categoryId: e.target.value,
                        subcategoryId: null,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.categoryId}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Subcategory (Optional)
                  </label>
                  <select
                    value={formValues.subcategoryId || ""}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        subcategoryId: e.target.value || null,
                      })
                    }
                    disabled={!formValues.categoryId}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500 disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {categorySubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.subcategoryId && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.subcategoryId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Priority *
                  </label>
                  <select
                    value={formValues.priority}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        priority: e.target.value as TicketPriority | "",
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="">Select priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {formErrors.priority && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.priority}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formValues.description}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="SLA description..."
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-400">
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Response Time (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formValues.responseTimeMinutes}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        responseTimeMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="e.g., 30"
                  />
                  {formErrors.responseTimeMinutes && (
                    <p className="mt-1 text-sm text-red-400">
                      {formErrors.responseTimeMinutes}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Resolution Time (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formValues.resolutionTimeMinutes}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        resolutionTimeMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="e.g., 480"
                  />
                  {formErrors.resolutionTimeMinutes && (
                    <p className="mt-1 text-sm text-red-400">
                      {formErrors.resolutionTimeMinutes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formValues.active}
                  onChange={(e) =>
                    setFormValues({ ...formValues, active: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 bg-slate-900 border-slate-600 rounded focus:ring-green-500"
                />
                <label htmlFor="active" className="ml-2 text-sm text-slate-300">
                  Active
                </label>
              </div>

            </form>
          </Modal>
        )}

        {/* Filter by Category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Category
          </label>
          <select
            value={selectedCategoryIdForFilter}
            onChange={(e) => setSelectedCategoryIdForFilter(e.target.value)}
            className="w-full max-w-xs px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* SLAs List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">SLAs</h2>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              Refresh
            </button>
          </div>

          {slasLoading ? (
            <div className="p-8 text-center text-slate-400">Loading SLAs...</div>
          ) : filteredSLAs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No SLAs found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Subcategory
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Resolution Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredSLAs.map((sla) => (
                    <tr
                      key={sla.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {sla.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {sla.category?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {sla.subcategory?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            sla.priority === "high"
                              ? "bg-red-600/20 text-red-400"
                              : sla.priority === "medium"
                                ? "bg-yellow-600/20 text-yellow-400"
                                : "bg-green-600/20 text-green-400"
                          }`}
                        >
                          {sla.priority.charAt(0).toUpperCase() + sla.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {sla.responseTimeMinutes} min
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {sla.resolutionTimeMinutes} min
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            sla.active
                              ? "bg-green-600/20 text-green-400"
                              : "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {sla.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => handleEditClick(sla)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs mr-2 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sla.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {pendingDeleteId && (
          <Modal
            title="Confirm Delete"
            onClose={() => setPendingDeleteId(null)}
            actions={
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            }
          >
            <p className="text-gray-700">
              Are you sure you want to delete this SLA? This action cannot be undone.
            </p>
          </Modal>
        )}
      </div>
    </div>
  );
}
