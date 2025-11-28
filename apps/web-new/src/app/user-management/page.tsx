"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchAdminOverviewReport } from "@/services/tickets";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  type UserSummary,
  type UpdateUserPayload,
} from "@/services/users";
import {
  validateUserForm,
  type UserFormValues,
  type UserFormErrors,
} from "@/utils/userFormValidation";

type RoleFilterValue = "all" | "admin" | "agent" | "user";

const roleFilters: Array<{ label: string; value: RoleFilterValue }> = [
  { label: "All roles", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Agents", value: "agent" },
  { label: "Users", value: "user" },
];

const roleLabels = {
  admin: "Admin",
  agent: "Agent",
  user: "User",
} as const;

const makeEmptyForm = (): UserFormValues => ({
  name: "",
  email: "",
  role: "agent",
  password: "",
});

export default function UserManagementPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<UserFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: overview,
    isLoading: overviewLoading,
    isRefetching: overviewRefetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["reports", "admin", "user-management"],
    queryFn: fetchAdminOverviewReport,
    enabled: user?.role === "admin",
  });

  const {
    data: users,
    isLoading: usersLoading,
    isRefetching: usersRefetching,
    refetch: refetchUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["admin", "users", roleFilter],
    queryFn: () => fetchUsers(roleFilter === "all" ? {} : { role: roleFilter }),
    enabled: user?.role === "admin",
  });

  const assignments = overview?.assignmentLoad ?? [];
  const memberList = users ?? [];
  const refreshing = overviewRefetching || usersRefetching;
  const userSectionSubtitle =
    roleFilter === "all"
      ? `${memberList.length} member${memberList.length === 1 ? "" : "s"} in workspace`
      : `${memberList.length} ${roleLabels[roleFilter as "admin" | "agent" | "user"]} account${
          memberList.length === 1 ? "" : "s"
        }`;

  const handleRefresh = () => {
    refetchOverview();
    refetchUsers();
  };

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveUserId(null);
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

  const openEditForm = (entry: UserSummary) => {
    setFormMode("edit");
    setActiveUserId(entry.id);
    setFormErrors({});
    setFormValues({
      name: entry.name,
      email: entry.email,
      role: entry.role,
      password: "",
    });
    setFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save member.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (created) => {
      invalidateUsers();
      closeForm();
      alert(`${created.name} is ready to collaborate.`);
    },
    onError: handleMutationError,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateUserPayload;
    }) => updateUser(userId, payload),
    onSuccess: (updated) => {
      invalidateUsers();
      closeForm();
      alert(`${updated.name} was updated.`);
    },
    onError: handleMutationError,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onMutate: (userId) => {
      setPendingDeleteId(userId);
    },
    onSuccess: (removed) => {
      invalidateUsers();
      alert(`${removed.name || removed.email} no longer has workspace access.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to remove member.";
      alert(`Remove failed: ${message}`);
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const handleSubmitForm = () => {
    const validation = validateUserForm(formValues, {
      requirePassword: formMode === "create",
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    const normalized = {
      name: formValues.name.trim(),
      email: formValues.email.trim().toLowerCase(),
      role: formValues.role,
      password: formValues.password.trim(),
    };

    if (formMode === "create") {
      createUserMutation.mutate(normalized);
      return;
    }

    if (!activeUserId) {
      return;
    }

    const updatePayload: UpdateUserPayload = {
      name: normalized.name,
      email: normalized.email,
      role: normalized.role,
    };
    if (normalized.password) {
      updatePayload.password = normalized.password;
    }

    updateUserMutation.mutate({ userId: activeUserId, payload: updatePayload });
  };

  const confirmRemove = (entry: UserSummary) => {
    if (confirm(`Remove ${entry.name || entry.email} from the workspace?`)) {
      deleteUserMutation.mutate(entry.id);
    }
  };

  const saving = createUserMutation.isPending || updateUserMutation.isPending;
  const usersInitialLoading = usersLoading && !users;
  const overviewInitialLoading = overviewLoading && !overview;
  const usersErrorMessage =
    usersError instanceof Error
      ? usersError.message
      : "Unable to load directory.";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/90 mb-6">
            You need admin access to manage organization members.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-500 mb-4"
          >
            ← Back
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
                  <p className="text-white/90 mt-2">
                Review agent workloads and assignment coverage
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Active Agents Section */}
        <div className="card rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Active Agents</h2>
          <p className="text-white/90 mb-6">
            {assignments.length} team member{assignments.length === 1 ? "" : "s"}
          </p>

            {overviewInitialLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
          ) : assignments.length === 0 ? (
            <p className="text-white/80">No active agents found.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.agentId} className="flex justify-between items-center py-3 border-b border-white/6">
                  <div>
                    <p className="font-medium text-white">{assignment.agent?.name ?? "Unknown agent"}</p>
                    <p className="text-sm text-white/80">{assignment.agent?.email ?? "Not available"}</p>
                  </div>
                  <div className="bg-white/5 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {assignment.count} Tickets
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspace Directory */}
        <div className="card rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Workspace Directory</h2>
              <p className="text-white/90 mt-1">{userSectionSubtitle}</p>
            </div>
            <button
              onClick={openCreateForm}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
            >
              Add Member
            </button>
          </div>

          {/* Role Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {roleFilters.map((filter) => {
              const active = roleFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setRoleFilter(filter.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Users List */}
            {usersInitialLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
          ) : usersError ? (
            <p className="text-white/80">{usersErrorMessage}</p>
          ) : memberList.length === 0 ? (
            <p className="text-white/80">No members match this filter.</p>
          ) : (
            <div className="space-y-4">
              {memberList.map((entry) => (
                <div key={entry.id} className="flex justify-between items-center py-4 border-b border-white/6">
                  <div className="flex-1">
                    <p className="font-medium text-white">{entry.name}</p>
                    <p className="text-sm text-white/80">{entry.email}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entry.role === "admin"
                          ? "bg-white/5 text-white"
                          : entry.role === "agent"
                          ? "bg-white/5 text-white"
                          : "bg-white/5 text-white"
                      }`}
                    >
                      {roleLabels[entry.role]}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditForm(entry)}
                        className="px-3 py-1 text-sm border border-white/10 rounded hover:bg-white/8"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmRemove(entry)}
                        disabled={pendingDeleteId === entry.id}
                        className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        {pendingDeleteId === entry.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Form Modal */}
      {formVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {formMode === "create"
                    ? "Add Workspace Member"
                    : "Edit Workspace Member"}
                </h3>
                <button
                  onClick={closeForm}
                  className="text-white/60 hover:text-white/80"
                >
                  ✕
                </button>
              </div>

              <p className="text-white/80 mb-6">
                Invite teammates or adjust their access level. Password updates
                apply immediately.
              </p>

              {/* Name Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/90 mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Casey Admin"
                  value={formValues.name}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/5 text-white"
                />
                {formErrors.name && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/90 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="casey@example.com"
                  value={formValues.email}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/5 text-white"
                />
                {formErrors.email && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/90 mb-1">
                  {formMode === "create"
                    ? "Temporary password"
                    : "Reset password"}
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={formValues.password}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/5 text-white"
                />
                {formErrors.password && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.password}</p>
                )}
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Role
                </label>
                <div className="space-y-3">
                  {roleFilters
                    .filter((filter) => filter.value !== "all")
                    .map((filter) => {
                      const roleValue = filter.value as "admin" | "agent" | "user";
                      const selected = formValues.role === roleValue;
                      return (
                        <div
                          key={`role-${roleValue}`}
                          onClick={() =>
                            setFormValues((prev) => ({
                              ...prev,
                              role: roleValue,
                            }))
                          }
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selected
                              ? "border-white/10 bg-white/5"
                              : "border-white/6 hover:border-white/20"
                          }`}
                        >
                          <p
                            className={`font-medium ${selected ? "text-white" : "text-white/90"}`}
                          >
                            {filter.label.replace(/s$/, "")}
                          </p>
                          <p className="text-sm text-white/80 mt-1">
                            {roleValue === "admin"
                              ? "Full access"
                              : roleValue === "agent"
                              ? "Can work assigned tickets"
                              : "Submitters only"}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {formErrors.general && (
                <p className="text-red-600 text-sm mb-4">{formErrors.general}</p>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 text-white/70 border border-white/10 rounded-md hover:bg-white/6"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitForm}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : formMode === "create"
                    ? "Create User"
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}