"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTicket, updateTicket, type UpdateTicketPayload, type IssueType, type TicketPriority } from "@/services/tickets";
import { listAttributes, type TicketAttribute } from "@/services/attributes";
import { serializeMultiselectValue, deserializeMultiselectValue } from "@/utils/attributeValues";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

interface EditTicketPageProps {
  params: {
    ticketId: string;
  };
}

export default function EditTicketPage({ params }: EditTicketPageProps) {
  const { ticketId } = React.use(params as unknown as Promise<EditTicketPageProps["params"]>);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [issueType, setIssueType] = useState<IssueType>("other");
  const [attributes, setAttributes] = useState<TicketAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const authUser = useAuthStore((s) => s.session?.user);

  useEffect(() => {
    // Load custom attributes
    const loadAttributes = async () => {
      try {
        const attrs = await listAttributes();
        setAttributes(attrs);
      } catch (err) {
        console.error("Failed to load attributes", err);
      }
    };
    loadAttributes();
  }, []);

  useEffect(() => {
    if (ticket) {
      setDescription(ticket.description);
      setPriority(ticket.priority);
      setIssueType(ticket.issueType);
      
      // Load existing attribute values
      if (ticket.attributeValues) {
        const values: Record<string, string> = {};
        ticket.attributeValues.forEach(attrVal => {
          values[attrVal.attributeId] = attrVal.value;
        });
        setAttributeValues(values);
      }
    }
  }, [ticket]);

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

    const payload: UpdateTicketPayload = {
      description: description.trim(),
      priority,
      issueType,
      attributes: attributeValues,
    };

    try {
      await updateTicket(ticketId, payload);
      await queryClient.invalidateQueries({
        queryKey: ["tickets"],
        exact: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      router.push(`/ticket/${ticketId}`);
    } catch (err) {
      console.error("Update ticket failed", err);
      setError("Failed to update ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isResolved = ticket.status === "resolved";

  // Authorization: only the ticket owner can edit when not resolved
  if (ticket && authUser && authUser.id !== ticket.creator.id) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="card shadow rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Not authorized</h1>
            <p className="text-white/90 mb-6">Only the ticket owner can edit this ticket.</p>
            <button onClick={() => router.back()} className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20">Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (isResolved) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="card shadow rounded-lg p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Ticket is Resolved</h1>
              <p className="text-white/80 mb-6">
                This ticket has been resolved. To make changes, first reopen the ticket from the detail page.
              </p>
              <button
                onClick={() => router.push(`/ticket/${ticketId}`)}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Back to Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-white">Edit Ticket</h1>
          <p className="text-white/80">Ticket #{ticket.id.slice(0, 8)}</p>
        </div>

        <div className="card shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/5 text-white"
                placeholder="Describe the issue in detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
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
                    <span className="capitalize">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
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
                    <span className="capitalize">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Attributes */}
            {attributes.map((attr) => (
              <div key={attr.id}>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {attr.label}
                  {attr.isMandatory && <span className="text-red-400 ml-1">*</span>}
                </label>
                {attr.type === "select" && (
                  <select
                    value={attributeValues[attr.id] || ""}
                    onChange={(e) =>
                      setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white card text-white"
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
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white card text-white"
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
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white card text-white"
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
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white card text-white"
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
                    className="w-full px-3 py-2 border border-transparent rounded-lg focus:ring-2 focus:ring-white card text-white"
                    required={attr.isMandatory}
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-700/10 border border-red-600 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Updating..." : "Update Ticket"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/6"
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