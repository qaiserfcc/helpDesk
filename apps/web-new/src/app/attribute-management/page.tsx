"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import {
  fetchAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  type TicketAttribute,
  type AttributeType,
  type CreateAttributePayload,
  type UpdateAttributePayload,
} from "@/services/attributes";
import { Modal } from "@/components/Modal";

export default function AttributeManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);

  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<TicketAttribute | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAttributePayload>({
    name: "",
    label: "",
    type: "text",
    mandatory: false,
    visible: true,
    options: null,
    defaultValue: "",
    order: 1,
    active: true,
  });

  const [optionsText, setOptionsText] = useState("");

  // Check admin access
  React.useEffect(() => {
    if (!session?.user || session.user.role !== "admin") {
      router.push("/");
    }
  }, [session, router]);

  const { data: attributes, isLoading } = useQuery({
    queryKey: ["attributes"],
    queryFn: () => fetchAttributes(),
  });

  const createMutation = useMutation({
    mutationFn: createAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAttributePayload }) =>
      updateAttribute(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      setShowForm(false);
      setEditingAttribute(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      setShowDeleteModal(false);
      setAttributeToDelete(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      type: "text",
      mandatory: false,
      visible: true,
      options: null,
      defaultValue: "",
      order: (attributes?.length || 0) + 1,
      active: true,
    });
    setOptionsText("");
  };

  const handleCreate = () => {
    setEditingAttribute(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (attribute: TicketAttribute) => {
    setEditingAttribute(attribute);
    setFormData({
      name: attribute.name,
      label: attribute.label,
      type: attribute.type,
      mandatory: attribute.mandatory,
      visible: attribute.visible,
      options: attribute.options,
      defaultValue: attribute.defaultValue || "",
      order: attribute.order,
      active: attribute.active,
    });
    if (attribute.options) {
      try {
        const opts = Array.isArray(attribute.options)
          ? attribute.options
          : JSON.parse(attribute.options);
        setOptionsText(opts.join("\n"));
      } catch {
        setOptionsText("");
      }
    }
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let payload: CreateAttributePayload | UpdateAttributePayload = { ...formData };

    // Parse options for select/multiselect
    if (formData.type === "select" || formData.type === "multiselect") {
      if (optionsText.trim()) {
        const opts = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
        payload.options = opts;
      } else {
        payload.options = [];
      }
    } else {
      payload.options = null;
    }

    if (editingAttribute) {
      updateMutation.mutate({ id: editingAttribute.id, payload });
    } else {
      createMutation.mutate(payload as CreateAttributePayload);
    }
  };

  const handleDelete = (attributeId: string) => {
    setAttributeToDelete(attributeId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (attributeToDelete) {
      deleteMutation.mutate(attributeToDelete);
    }
  };

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  const sortedAttributes = attributes
    ? [...attributes].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Attribute Management</h1>
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
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              + Create Attribute
            </button>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Custom Ticket Attributes</h2>
          {isLoading ? (
            <p className="text-slate-400">Loading attributes...</p>
          ) : sortedAttributes.length > 0 ? (
            <div className="space-y-3">
              {sortedAttributes.map((attr) => (
                <div key={attr.id} className="bg-slate-700/50 backdrop-blur rounded-lg p-4 border border-slate-600 hover:bg-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm font-mono">#{attr.order}</span>
                        <h3 className="text-lg font-semibold text-white">{attr.label}</h3>
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded font-medium">
                          {attr.type}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">Name: {attr.name}</p>
                      {attr.defaultValue && (
                        <p className="text-slate-500 text-xs mt-1">Default: {attr.defaultValue}</p>
                      )}
                      {(attr.type === "select" || attr.type === "multiselect") && attr.options && (
                        <div className="mt-2">
                          <p className="text-slate-500 text-xs">Options:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(attr.options)
                              ? attr.options
                              : JSON.parse(attr.options || "[]")
                            ).map((opt: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {attr.mandatory && (
                        <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded font-medium">
                          Required
                        </span>
                      )}
                      {!attr.visible && (
                        <span className="px-2 py-1 bg-slate-600/20 text-slate-400 text-xs rounded font-medium">
                          Hidden
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          attr.active ? "bg-green-600/20 text-green-400" : "bg-slate-600/20 text-slate-400"
                        }`}
                      >
                        {attr.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => handleEdit(attr)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(attr.id)}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No custom attributes yet. Create one to get started!</p>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <Modal
          title={editingAttribute ? "Edit Attribute" : "Create Attribute"}
          onClose={() => {
            setShowForm(false);
            setEditingAttribute(null);
            resetForm();
          }}
          maxWidthClass="max-w-2xl"
          actions={
            <button
              type="submit"
              form="attribute-form"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {editingAttribute ? "Update" : "Create"}
            </button>
          }
        >
          <form id="attribute-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name (unique identifier) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., server_name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (display) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Server Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AttributeType })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select (dropdown)</option>
                <option value="multiselect">Multi-select</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean (yes/no)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <input
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(formData.type === "select" || formData.type === "multiselect") && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options (one per line) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={4}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Value</label>
              <input
                type="text"
                value={formData.defaultValue}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-6 flex-wrap md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mandatory"
                  checked={formData.mandatory}
                  onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="mandatory" className="ml-2 text-sm font-medium text-gray-700">
                  Mandatory
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="visible"
                  checked={formData.visible}
                  onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="visible" className="ml-2 text-sm font-medium text-gray-700">
                  Visible
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Confirm Delete</h2>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this attribute? This action cannot be undone and may
              affect existing tickets with this attribute.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAttributeToDelete(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
