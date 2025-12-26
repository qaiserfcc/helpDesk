"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createTicket, type CreateTicketPayload, type IssueType, type TicketPriority } from "@/services/tickets";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchCategories, fetchSubcategories, type Category, type Subcategory } from "@/services/categories";
import { fetchAttributes, setTicketAttributeValue, type TicketAttribute } from "@/services/attributes";
import { Modal } from "@/components/Modal";

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
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showTicketModal, setShowTicketModal] = useState(true);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const session = useAuthStore((s) => s.session);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });

  const { data: attributes } = useQuery({
    queryKey: ["attributes"],
    queryFn: () => fetchAttributes(),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: () => (categoryId ? fetchSubcategories(categoryId) : Promise.resolve([])),
    enabled: !!categoryId,
  });

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategoryId("");
  }, [categoryId]);

  const visibleAttributes = attributes?.filter((attr) => attr.visible && attr.active) || [];

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

    if (!categoryId) {
      setError("Category is required");
      return;
    }

    if (!subcategoryId) {
      setError("Subcategory is required");
      return;
    }

    // Validate mandatory attributes
    const mandatoryAttrs = visibleAttributes.filter((attr) => attr.mandatory);
    for (const attr of mandatoryAttrs) {
      if (!attributeValues[attr.id]) {
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
      categoryId,
      subcategoryId,
    };

    try {
      const created = await createTicket(payload);

      // Set attribute values for the ticket
      if (created?.id) {
        const attrPromises = Object.entries(attributeValues).map(([attrId, value]) =>
          setTicketAttributeValue(created.id, attrId, { value })
        );
        await Promise.all(attrPromises);
      }
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

  const handleCloseModal = () => {
    setShowTicketModal(false);
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0f172a] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-300 hover:text-blue-200 mb-4 inline-flex items-center gap-2"
        >
          <span aria-hidden>←</span> Back
        </button>

        {showTicketModal && (
          <Modal
            title="Create New Ticket"
            onClose={handleCloseModal}
            actions={
              <button
                type="submit"
                form="ticket-form"
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create Ticket"}
              </button>
            }
          >
            <form id="ticket-form" onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Priority</label>
                <div className="flex flex-wrap gap-4">
                  {priorityOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-gray-800">
                      <input
                        type="radio"
                        name="priority"
                        value={option}
                        checked={priority === option}
                        onChange={(e) => setPriority(e.target.value as TicketPriority)}
                        className="h-4 w-4"
                      />
                      <span className="capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Issue Type</label>
                <div className="flex flex-wrap gap-4">
                  {issueOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-gray-800">
                      <input
                        type="radio"
                        name="issueType"
                        value={option}
                        checked={issueType === option}
                        onChange={(e) => setIssueType(e.target.value as IssueType)}
                        className="h-4 w-4"
                      />
                      <span className="capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-800 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories?.filter((c) => c.active).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div>
                  <label htmlFor="subcategory" className="block text-sm font-medium text-gray-800 mb-2">
                    Subcategory
                  </label>
                  <select
                    id="subcategory"
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select a subcategory</option>
                    {subcategories.filter((sc) => sc.active).map((subcat) => (
                      <option key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {visibleAttributes.length > 0 && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                  {visibleAttributes.map((attr) => (
                    <div key={attr.id}>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        {attr.label} {attr.mandatory && <span className="text-red-500">*</span>}
                      </label>
                      {attr.type === "text" && (
                        <input
                          type="text"
                          value={attributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                          }
                          required={attr.mandatory}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      )}
                      {attr.type === "number" && (
                        <input
                          type="number"
                          value={attributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                          }
                          required={attr.mandatory}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      )}
                      {attr.type === "date" && (
                        <input
                          type="date"
                          value={attributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                          }
                          required={attr.mandatory}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      )}
                      {attr.type === "boolean" && (
                        <select
                          value={attributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                          }
                          required={attr.mandatory}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      )}
                      {attr.type === "select" && (
                        <select
                          value={attributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                          }
                          required={attr.mandatory}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {(Array.isArray(attr.options) ? attr.options : JSON.parse(attr.options || "[]")).map(
                            (opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            )
                          )}
                        </select>
                      )}
                      {attr.type === "multiselect" && (
                        <textarea
                          value={attributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                          }
                          placeholder="Enter values separated by commas"
                          required={attr.mandatory}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}