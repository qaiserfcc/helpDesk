"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchTicket, updateTicket, type UpdateTicketPayload } from "@/services/tickets";
import {
  TicketFields,
  useTicketFieldsData,
  type TicketFormValues,
} from "@/components/tickets/TicketFields";

interface EditTicketPageProps {
  params: {
    ticketId: string;
  };
}

export default function EditTicketPage({ params }: EditTicketPageProps) {
  const { ticketId } = React.use(params as unknown as Promise<EditTicketPageProps["params"]>);
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const authUser = useAuthStore((s) => s.session?.user);

  const makeEmpty = (): TicketFormValues => ({
    description: "",
    priority: "medium",
    issueType: "other",
    categoryId: "",
    subcategoryId: "",
    attributes: {},
  });

  const [values, setValues] = useState<TicketFormValues>(makeEmpty());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [prefilledAttributes, setPrefilledAttributes] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const isResolved = ticket?.status === "resolved";
  const canEdit = Boolean(
    ticket &&
      authUser &&
      !isResolved &&
      (authUser.role === "admin" || authUser.id === ticket.creator.id),
  );

  const fieldsData = useTicketFieldsData({
    enabled: Boolean(session?.accessToken) && Boolean(canEdit),
    categoryId: values.categoryId,
  });

  const visibleAttributeKeys = useMemo(() => {
    return new Set((fieldsData.attributes ?? []).map((a) => a.key));
  }, [fieldsData.attributes]);

  useEffect(() => {
    if (!ticket) return;
    setValues({
      description: ticket.description,
      priority: ticket.priority,
      issueType: ticket.issueType,
      categoryId: ticket.category?.id ?? "",
      subcategoryId: ticket.subcategory?.id ?? "",
      attributes: {},
    });
    setPrefilledAttributes(false);
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    if (prefilledAttributes) return;
    if (fieldsData.attributesLoading) return;
    if (!fieldsData.attributes.length) {
      setPrefilledAttributes(true);
      return;
    }

    const nextAttrs: Record<string, unknown> = {};
    for (const av of ticket.attributeValues ?? []) {
      const key = av.attribute?.key;
      if (!key) continue;
      if (!visibleAttributeKeys.has(key)) continue;
      nextAttrs[key] = av.value;
    }

    setValues((prev) => ({
      ...prev,
      attributes: { ...nextAttrs, ...prev.attributes },
    }));
    setPrefilledAttributes(true);
  }, [ticket, fieldsData.attributesLoading, fieldsData.attributes.length, prefilledAttributes, visibleAttributeKeys]);

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

    const filteredAttributes = Object.fromEntries(
      Object.entries(values.attributes || {}).filter(([key]) =>
        visibleAttributeKeys.has(key),
      ),
    );

    const payload: UpdateTicketPayload = {
      description: values.description.trim(),
      priority: values.priority,
      issueType: values.issueType,
      categoryId: values.categoryId || undefined,
      subcategoryId: values.subcategoryId || undefined,
      attributes: Object.keys(filteredAttributes).length ? filteredAttributes : undefined,
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

  if (ticket && authUser && !canEdit) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="card shadow rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Not authorized</h1>
            <p className="text-white/90 mb-6">Only the ticket owner, assigned agent, or an admin can edit this ticket.</p>
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
            <TicketFields
              values={values}
              onChange={setValues}
              data={fieldsData}
              descriptionError={error && !values.description.trim() ? "Description is required" : undefined}
            />

            {error && (
              <div className="bg-red-700/10 border border-red-600 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 primary-btn py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Updating..." : "Update Ticket"}
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