"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  listAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  type TicketAttribute,
  type AttributeType,
} from "@/services/attributes";

export default function AttributesPage() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [attributes, setAttributes] = useState<TicketAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] =
    useState<TicketAttribute | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    type: "text" as AttributeType,
    options: [] as string[],
    optionsText: "",
    defaultValue: "",
    isMandatory: false,
    isVisible: true,
    order: 0,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || session.user.role !== "admin") {
      router.push("/");
      return;
    }
    loadAttributes();
  }, [session, router]);

  const loadAttributes = async () => {
    try {
      setLoading(true);
      const data = await listAttributes();
      setAttributes(data);
    } catch (err) {
      console.error("Failed to load attributes", err);
      setError("Failed to load attributes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        label: formData.label,
        type: formData.type,
        options:
          formData.type === "select" || formData.type === "multiselect"
            ? formData.optionsText
                .split("\n")
                .map((o) => o.trim())
                .filter((o) => o)
            : [],
        defaultValue: formData.defaultValue || undefined,
        isMandatory: formData.isMandatory,
        isVisible: formData.isVisible,
        order: formData.order,
      };

      if (editingAttribute) {
        await updateAttribute(editingAttribute.id, payload);
      } else {
        await createAttribute(payload);
      }

      await loadAttributes();
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save attribute", err);
      setError(err instanceof Error ? err.message : "Failed to save attribute");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (attr: TicketAttribute) => {
    setEditingAttribute(attr);
    setFormData({
      name: attr.name,
      label: attr.label,
      type: attr.type,
      options: attr.options,
      optionsText: attr.options.join("\n"),
      defaultValue: attr.defaultValue || "",
      isMandatory: attr.isMandatory,
      isVisible: attr.isVisible,
      order: attr.order,
    });
    setShowForm(true);
  };

  const handleDelete = async (attributeId: string) => {
    if (!confirm("Are you sure you want to delete this attribute?")) {
      return;
    }

    try {
      await deleteAttribute(attributeId);
      await loadAttributes();
    } catch (err) {
      console.error("Failed to delete attribute", err);
      setError(err instanceof Error ? err.message : "Failed to delete attribute");
    }
  };

  const resetForm = () => {
    setEditingAttribute(null);
    setFormData({
      name: "",
      label: "",
      type: "text",
      options: [],
      optionsText: "",
      defaultValue: "",
      isMandatory: false,
      isVisible: true,
      order: 0,
    });
    setError("");
  };

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Ticket Attributes
            </h1>
            <p className="text-white/70 mt-2">
              Manage configurable ticket attributes for your helpdesk
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="primary-btn px-4 py-2 rounded-lg"
          >
            + New Attribute
          </button>
        </div>

        {error && (
          <div className="bg-red-50/30 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {showForm && (
          <div className="card shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingAttribute ? "Edit Attribute" : "New Attribute"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Name (internal) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    placeholder="e.g., sla, impact, urgency"
                    required
                    disabled={!!editingAttribute}
                    pattern="[a-z0-9_]+"
                    title="Lowercase letters, numbers, and underscores only"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Label (display) *
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    placeholder="e.g., SLA, Impact, Urgency"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as AttributeType,
                      })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select (single)</option>
                    <option value="multiselect">Select (multiple)</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    min="0"
                  />
                </div>
              </div>

              {(formData.type === "select" || formData.type === "multiselect") && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Options (one per line) *
                  </label>
                  <textarea
                    value={formData.optionsText}
                    onChange={(e) =>
                      setFormData({ ...formData, optionsText: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    placeholder="low\nmedium\nhigh"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Default Value
                </label>
                <input
                  type="text"
                  value={formData.defaultValue}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultValue: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                />
              </div>

              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory}
                    onChange={(e) =>
                      setFormData({ ...formData, isMandatory: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-white">Mandatory</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) =>
                      setFormData({ ...formData, isVisible: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-white">Visible</span>
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 primary-btn py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingAttribute
                      ? "Update"
                      : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/6 text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-white/70">Loading attributes...</p>
          </div>
        ) : (
          <div className="card shadow rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {attributes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-white/70">
                      No attributes defined yet
                    </td>
                  </tr>
                ) : (
                  attributes.map((attr) => (
                    <tr key={attr.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-white">
                        {attr.label}
                        {attr.isMandatory && (
                          <span className="ml-2 text-red-400">*</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white/70">
                        {attr.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300">
                          {attr.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attr.isVisible ? (
                          <span className="text-green-400">Visible</span>
                        ) : (
                          <span className="text-white/50">Hidden</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white/70">
                        {attr.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleEdit(attr)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(attr.id)}
                          className="text-red-400 hover:text-red-300"
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
        )}
      </div>
    </div>
  );
}
