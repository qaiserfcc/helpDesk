"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createTicket, type CreateTicketPayload } from "@/services/tickets";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  TicketFields,
  useTicketFieldsData,
  type TicketFormValues,
} from "@/components/tickets/TicketFields";

const makeEmpty = (): TicketFormValues => ({
  description: "",
  priority: "medium",
  issueType: "other",
  categoryId: "",
  subcategoryId: "",
  attributes: {},
});

export default function NewTicketPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<TicketFormValues>(makeEmpty());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const addNotification = useNotificationStore((s) => s.addNotification);
  const session = useAuthStore((s) => s.session);

  const canCreate =
    session &&
    (session.user.role === "user" ||
      session.user.role === "admin" ||
      session.user.role === "agent");

  const fieldsData = useTicketFieldsData({
    enabled: Boolean(session?.accessToken) && Boolean(canCreate),
    categoryId: values.categoryId,
  });
  if (!canCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto card rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not authorized</h1>
          <p className="text-white/90 mb-6">Only users, agents, and admins can create tickets.</p>
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
    if (!values.description.trim()) {
      setError("Description is required");
      return;
    }

    if (fieldsData.attributesError) {
      setError("Unable to load attributes. Please retry.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: CreateTicketPayload = {
      description: values.description.trim(),
      priority: values.priority,
      issueType: values.issueType,
      categoryId: values.categoryId || undefined,
      subcategoryId: values.subcategoryId || undefined,
      attributes: Object.keys(values.attributes || {}).length ? values.attributes : undefined,
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
            <TicketFields
              values={values}
              onChange={(next) => setValues(next)}
              data={fieldsData}
              descriptionError={error && !values.description.trim() ? "Description is required" : undefined}
            />

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