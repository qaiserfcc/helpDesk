"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createTicket, type CreateTicketPayload, type IssueType, type TicketPriority } from "@/services/tickets";
import { listAttributes, type TicketAttribute } from "@/services/attributes";
import { fetchCategories, type Category } from "@/services/categories";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { serializeMultiselectValue, deserializeMultiselectValue } from "@/utils/attributeValues";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

export default function NewTicketPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [issueType, setIssueType] = useState<IssueType>("other");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<TicketAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const addNotification = useNotificationStore((s) => s.addNotification);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    // Load categories and custom attributes
    const loadData = async () => {
      try {
        const [cats, attrs] = await Promise.all([
          fetchCategories(),
          listAttributes(),
        ]);
        setCategories(cats);
        setAttributes(attrs);
        // Initialize attribute values with defaults
        const defaults: Record<string, string> = {};
        attrs.forEach(attr => {
          if (attr.defaultValue) {
            defaults[attr.id] = attr.defaultValue;
          }
        });
        setAttributeValues(defaults);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
  }, []);

  if (!session) return null;
  const canCreate = session.user.role === "user" || session.user.role === "admin";
  if (!canCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not authorized</h1>
          <p className="text-white/90 mb-6">Only users and admins can create tickets.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    // Validate mandatory custom attributes
    for (const attr of attributes) {
      if (attr.isMandatory && !attributeValues[attr.id]) {
        setError(`${attr.label} is required`);
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const payload: CreateTicketPayload = {
      description: description.trim(),
      priority,
      issueType,
      attributes: attributeValues,
      ...(categoryId && { categoryId }),
      ...(subcategoryId && { subcategoryId }),
    };

    try {
      const created = await createTicket(payload);
      await queryClient.invalidateQueries({
        queryKey: ["tickets"],
        exact: false,
      });
      // Redirect to the newly created ticket detail page so users can review & attach files
      if (created?.id) {
        addNotification({
          id: created.id,
          ticketId: created.id,
          actor: session?.user?.name ?? "",
          summary: `Created ticket: ${created.description?.slice(0, 50)}`,
          createdAt: created.createdAt,
          type: "ticket",
        });
        router.push(`/ticket/${created.id}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Create ticket failed", err);
      setError("Failed to create ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-500 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Create New Ticket</h1>
        </div>

        <div className="card shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-white/90 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white focus:border-white text-white card"
                placeholder="Describe the issue in detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Priority
              </label>
              <div className="flex space-x-3">
                {priorityOptions.map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value={option}
                      checked={priority === option}
                      onChange={(e) => setPriority(e.target.value as TicketPriority)}
                      className="mr-2"
                    />
                    <span className="capitalize text-white">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Issue Type
              </label>
              <div className="flex flex-wrap gap-3">
                {issueOptions.map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="issueType"
                      value={option}
                      checked={issueType === option}
                      onChange={(e) => setIssueType(e.target.value as IssueType)}
                      className="mr-2"
                    />
                    <span className="capitalize text-white">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-white/90 mb-2">
                Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId(""); // Reset subcategory when category changes
                }}
                className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
              >
                <option value="">Select a category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {categoryId && (
              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-white/90 mb-2">
                  Subcategory
                </label>
                <select
                  id="subcategory"
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                >
                  <option value="">Select a subcategory (optional)</option>
                  {categories
                    .find((cat) => cat.id === categoryId)
                    ?.subcategories?.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Custom Attributes */}
            {attributes.map((attr) => (
              <div key={attr.id}>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {attr.label}
                  {attr.isMandatory && <span className="text-red-400 ml-1">*</span>}
                </label>
                {attr.type === "select" && (
                  <select
                    value={attributeValues[attr.id] || ""}
                    onChange={(e) =>
                      setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    required={attr.isMandatory}
                  >
                    <option value="">Select...</option>
                    {attr.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {attr.type === "multiselect" && (
                  <select
                    multiple
                    value={deserializeMultiselectValue(attributeValues[attr.id] || "")}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                      setAttributeValues({ ...attributeValues, [attr.id]: serializeMultiselectValue(selected) });
                    }}
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    required={attr.isMandatory}
                  >
                    {attr.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {attr.type === "text" && (
                  <input
                    type="text"
                    value={attributeValues[attr.id] || ""}
                    onChange={(e) =>
                      setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    required={attr.isMandatory}
                  />
                )}
                {attr.type === "number" && (
                  <input
                    type="number"
                    value={attributeValues[attr.id] || ""}
                    onChange={(e) =>
                      setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    required={attr.isMandatory}
                  />
                )}
                {attr.type === "date" && (
                  <input
                    type="date"
                    value={attributeValues[attr.id] || ""}
                    onChange={(e) =>
                      setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white text-white card"
                    required={attr.isMandatory}
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50/30 border border-red-200 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 primary-btn py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create Ticket"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/6 text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}