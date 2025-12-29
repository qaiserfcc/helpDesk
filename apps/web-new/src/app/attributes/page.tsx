"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchAllAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  type Attribute,
  type CreateAttributePayload,
  type UpdateAttributePayload,
} from "@/services/attributes";
import { Modal, ModalActions } from "@/components/Modal";
import { DataList } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";

type AttributeFormValues = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "file";
  options: string;
  required: boolean;
  visibleTo: Array<"user" | "agent" | "admin">;
  active: boolean;
};

type FormErrors = Record<string, string>;

const typeLabels = {
  text: "Short Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  multiselect: "Multi-Select",
  file: "File Upload",
} as const;

const makeEmptyForm = (): AttributeFormValues => ({
  key: "",
  label: "",
  type: "text",
  options: "",
  required: false,
  visibleTo: ["user", "agent", "admin"],
  active: true,
});

export default function AttributesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<AttributeFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeAttributeId, setActiveAttributeId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: attributes,
    isLoading: attributesLoading,
    isRefetching: attributesRefetching,
    refetch: refetchAttributes,
    error: attributesError,
  } = useQuery({
    queryKey: ["admin", "attributes"],
    queryFn: fetchAllAttributes,
    enabled: user?.role === "admin",
  });

  const refreshing = attributesRefetching;
  const attributeList = attributes ?? [];

  const handleRefresh = () => {
    refetchAttributes();
  };

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveAttributeId(null);
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

  const openEditForm = (entry: Attribute) => {
    setFormMode("edit");
    setActiveAttributeId(entry.id);
    setFormErrors({});
    setFormValues({
      key: entry.key,
      label: entry.label,
      type: entry.type as "text" | "number" | "date" | "select" | "multiselect" | "file",
      options: entry.options?.join("\n") ?? "",
      required: entry.required ?? false,
      visibleTo: entry.visibleTo ?? ["user", "agent", "admin"],
      active: entry.active ?? true,
    });
    setFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save attribute.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateAttributes = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "attributes"] });
  };

  const createAttributeMutation = useMutation({
    mutationFn: (payload: CreateAttributePayload) => createAttribute(payload),
    onSuccess: (created) => {
      invalidateAttributes();
      closeForm();
      alert(`Attribute "${created.label}" created successfully.`);
    },
    onError: handleMutationError,
  });

  const updateAttributeMutation = useMutation({
    mutationFn: ({
      attributeId,
      payload,
    }: {
      attributeId: string;
      payload: UpdateAttributePayload;
    }) => updateAttribute(attributeId, payload),
    onSuccess: (updated) => {
      invalidateAttributes();
      closeForm();
      alert(`Attribute "${updated.label}" updated successfully.`);
    },
    onError: handleMutationError,
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: (attributeId: string) => deleteAttribute(attributeId),
    onMutate: (attributeId) => {
      setPendingDeleteId(attributeId);
    },
    onSuccess: (removed) => {
      invalidateAttributes();
      alert(`Attribute "${removed.label}" deleted.`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to delete attribute.";
      alert(`Delete failed: ${message}`);
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formValues.key.trim()) {
      errors.key = "Key is required";
    } else if (!/^[a-z_][a-z0-9_]*$/.test(formValues.key)) {
      errors.key = "Key must start with letter/underscore and contain only lowercase letters, numbers, underscores";
    }

    if (!formValues.label.trim()) {
      errors.label = "Label is required";
    }

    if (
      (formValues.type === "select" || formValues.type === "multiselect") &&
      !formValues.options.trim()
    ) {
      errors.options = "Options are required for dropdown fields";
    }

    if (
      (formValues.type === "select" || formValues.type === "multiselect") &&
      formValues.options.trim()
    ) {
      const optionList = formValues.options
        .split("\n")
        .map((opt) => opt.trim())
        .filter((opt) => opt);
      if (optionList.length < 2) {
        errors.options = "At least 2 options are required for dropdown fields";
      }
    }

    if (formValues.visibleTo.length === 0) {
      errors.visibleTo = "At least one role must be selected";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = () => {
    if (!validateForm()) {
      return;
    }

    const payload: CreateAttributePayload = {
      key: formValues.key.trim(),
      label: formValues.label.trim(),
      type: formValues.type,
      required: formValues.required,
      visibleTo: formValues.visibleTo,
      active: formValues.active,
    };

    if (
      (formValues.type === "select" || formValues.type === "multiselect") &&
      formValues.options.trim()
    ) {
      payload.options = formValues.options
        .split("\n")
        .map((opt) => opt.trim())
        .filter((opt) => opt);
    }

    if (formMode === "create") {
      createAttributeMutation.mutate(payload);
      return;
    }

    if (!activeAttributeId) {
      return;
    }

    updateAttributeMutation.mutate({ attributeId: activeAttributeId, payload });
  };

  const confirmRemove = (entry: Attribute) => {
    if (confirm(`Delete attribute "${entry.label}"? This cannot be undone.`)) {
      deleteAttributeMutation.mutate(entry.id);
    }
  };

  const saving =
    createAttributeMutation.isPending || updateAttributeMutation.isPending;
  const attributesInitialLoading = attributesLoading && !attributes;
  const attributesErrorMessage =
    attributesError instanceof Error
      ? attributesError.message
      : "Unable to load attributes.";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admins Only</h1>
          <p className="text-white/80 mb-6">
            You need admin access to manage ticket attributes.
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
              <h1 className="text-3xl font-bold text-white">Ticket Attributes</h1>
              <p className="text-white/70 mt-2">
                Define custom fields and attributes for ticket creation
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

        {/* Attributes List */}
        <div className="card rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Custom Fields
              </h2>
              <p className="text-white/70 mt-1">
                {attributeList.length} attribute
                {attributeList.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="secondary" onClick={openCreateForm}>
              Add Attribute
            </Button>
          </div>

          {/* Attributes List */}
          {attributesError ? (
            <div className="card rounded-lg p-6">
              <p className="text-white/80">{attributesErrorMessage}</p>
            </div>
          ) : (
            <DataList
              data={attributeList}
              getRowKey={(entry) => entry.id}
              isLoading={attributesInitialLoading}
              emptyMessage="No attributes yet. Create one to get started."
              renderItem={(entry) => (
                <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-white">{entry.label}</p>
                    <p className="text-sm text-white/70">
                      {entry.key} •{" "}
                      {typeLabels[entry.type as keyof typeof typeLabels]}
                      {entry.required ? " • Required" : ""}
                    </p>
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

      {/* Attribute Form Modal */}
      <Modal
        isOpen={formVisible}
        onClose={closeForm}
        title={
          formMode === "create"
            ? "Create Attribute"
            : "Edit Attribute"
        }
        size="md"
      >
        <p className="text-white/80 mb-6">
          {formMode === "create"
            ? "Define a new custom field for tickets."
            : "Update attribute details."}
        </p>

        <FormField
          label="Field Key"
          type="text"
          placeholder="e.g., priority_level"
          value={formValues.key}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, key: e.target.value }))
          }
          error={formErrors.key}
          required
          helperText="Lowercase letters, numbers, and underscores only"
        />

        <FormField
          label="Field Label"
          type="text"
          placeholder="e.g., Priority Level"
          value={formValues.label}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, label: e.target.value }))
          }
          error={formErrors.label}
          required
        />

        {/* Field Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">
            Field Type <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="space-y-2">
            {Object.entries(typeLabels).map(([value, label]) => (
              <div
                key={value}
                onClick={() =>
                  setFormValues((prev) => ({
                    ...prev,
                    type: value as
                      | "text"
                      | "number"
                      | "date"
                      | "select"
                      | "multiselect"
                      | "file",
                  }))
                }
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formValues.type === value
                    ? "border-primary-blue bg-primary-alpha-8"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <p
                  className={`font-medium ${
                    formValues.type === value ? "text-white" : "text-white/90"
                  }`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Options (for select/multiselect type) */}
        {(formValues.type === "select" || formValues.type === "multiselect") && (
          <FormField
            label="Options"
            type="textarea"
            placeholder="One option per line"
            value={formValues.options}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                options: e.target.value,
              }))
            }
            error={formErrors.options}
            required
          />
        )}

        {/* Required Checkbox */}
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formValues.required}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  required: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-white/30"
            />
            <span className="text-white/90">Required field</span>
          </label>
        </div>

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

        {/* Visible To */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">
            Visible To
          </label>
          <div className="space-y-2">
            {["user", "agent", "admin"].map((role) => (
              <div key={role} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  title={`Visible to ${role}`}
                  aria-label={`Visible to ${role}`}
                  checked={formValues.visibleTo.includes(
                    role as "user" | "agent" | "admin"
                  )}
                  onChange={(e) => {
                    setFormValues((prev) => ({
                      ...prev,
                      visibleTo: e.target.checked
                        ? [
                            ...prev.visibleTo,
                            role as "user" | "agent" | "admin",
                          ]
                        : prev.visibleTo.filter(
                            (r) => r !== (role as "user" | "agent" | "admin")
                          ),
                    }));
                  }}
                  className="w-4 h-4 rounded border-white/30"
                />
                <label className="text-white/90 capitalize cursor-pointer">
                  {role}
                </label>
              </div>
            ))}
          </div>
          {formErrors.visibleTo && (
            <p className="text-red-400 text-sm mt-2">{formErrors.visibleTo}</p>
          )}
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
            {formMode === "create" ? "Create Attribute" : "Save Changes"}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
