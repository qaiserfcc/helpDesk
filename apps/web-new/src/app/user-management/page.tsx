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
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

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
          <p className="text-white/80 mb-6">
            You need admin access to manage organization members.
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
              <h1 className="text-3xl font-bold text-white">User Management</h1>
                  <p className="text-white/70 mt-2">
                Review agent workloads and assignment coverage
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
              <p className="text-white/70 mt-1">{userSectionSubtitle}</p>
            </div>
            <Button variant="secondary" onClick={openCreateForm}>
              Add Member
            </Button>
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
          {usersError ? (
            <div className="card rounded-lg p-6">
              <p className="text-white/80">{usersErrorMessage}</p>
            </div>
          ) : (
            <DataList
              data={memberList}
              getRowKey={(entry) => entry.id}
              isLoading={usersInitialLoading}
              emptyMessage="No members match this filter."
              renderItem={(entry) => (
                <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-white">{entry.name}</p>
                    <p className="text-sm text-white/70">{entry.email}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-alpha-15 text-white border border-primary-alpha-20">
                      {roleLabels[entry.role]}
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
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={formVisible}
        onClose={closeForm}
        title={formMode === "create" ? "Add Workspace Member" : "Edit Workspace Member"}
        size="md"
      >
        <p className="text-white/80 mb-6">
          Invite teammates or adjust their access level. Password updates apply immediately.
        </p>

        <FormField
          label="Full name"
          type="text"
          placeholder="Casey Admin"
          value={formValues.name}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, name: e.target.value }))
          }
          error={formErrors.name}
          required
        />

        <FormField
          label="Email"
          type="email"
          placeholder="casey@example.com"
          value={formValues.email}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, email: e.target.value }))
          }
          error={formErrors.email}
          required
        />

        <FormField
          label={formMode === "create" ? "Temporary password" : "Reset password"}
          type="password"
          placeholder="At least 6 characters"
          value={formValues.password}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, password: e.target.value }))
          }
          error={formErrors.password}
          required={formMode === "create"}
          helperText={formMode === "edit" ? "Leave blank to keep current password" : undefined}
        />

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">
            Role <span className="text-red-400 ml-1">*</span>
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
                        ? "border-primary-blue bg-primary-alpha-8"
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <p className={`font-medium ${selected ? "text-white" : "text-white/90"}`}>
                      {filter.label.replace(/s$/, "")}
                    </p>
                    <p className="text-sm text-white/70 mt-1">
                      {roleValue === "admin"
                        ? "Full access to all features"
                        : roleValue === "agent"
                        ? "Can work on assigned tickets"
                        : "Can create and view own tickets"}
                    </p>
                  </div>
                );
              })}
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
            {formMode === "create" ? "Create User" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}