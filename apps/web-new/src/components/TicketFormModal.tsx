"use client";

import { useState, useEffect } from "react";
import { Modal, ModalActions } from "@/components/Modal";
import { Button } from "@/components/Button";
import {
  createTicket,
  updateTicket,
  type CreateTicketPayload,
} from "@/services/tickets";
import { useTicketModalStore } from "@/store/useTicketModalStore";
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

export function TicketFormModal() {
  const { isOpen, mode, ticket, onSaved, close } = useTicketModalStore();
  const session = useAuthStore((s) => s.session);
  const [values, setValues] = useState<TicketFormValues>(makeEmpty());
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && ticket) {
        setValues({
          description: ticket.description,
          priority: ticket.priority,
          issueType: ticket.issueType,
          categoryId: ticket.category?.id ?? "",
          subcategoryId: ticket.subcategory?.id ?? "",
          attributes: ticket.attributeValues?.reduce<Record<string, unknown>>((acc, entry) => {
            acc[entry.attribute.key] = entry.value as unknown;
            return acc;
          }, {}) ?? {},
        });
      } else {
        setValues(makeEmpty());
      }
      setError("");
      setSaving(false);
    }
  }, [isOpen, mode, ticket]);

  const dataEnabled = isOpen && Boolean(session?.accessToken);
  const fieldsData = useTicketFieldsData({
    enabled: dataEnabled,
    categoryId: values.categoryId,
  });

  const handleSubmit = async () => {
    if (!values.description.trim()) {
      setError("Description is required");
      return;
    }

    if (fieldsData.attributesError) {
      setError("Unable to load attributes. Please retry.");
      return;
    }

    const payloadAttributes = Object.keys(values.attributes || {}).length
      ? values.attributes
      : undefined;

    setSaving(true);
    setError("");

    try {
      if (mode === "create") {
        const payload: CreateTicketPayload = {
          description: values.description.trim(),
          priority: values.priority,
          issueType: values.issueType,
          categoryId: values.categoryId || undefined,
          subcategoryId: values.subcategoryId || undefined,
          attributes: payloadAttributes,
        };
        await createTicket(payload);
      } else if (mode === "edit" && ticket) {
        await updateTicket(ticket.id, {
          description: values.description.trim(),
          priority: values.priority,
          issueType: values.issueType,
          categoryId: values.categoryId || undefined,
          subcategoryId: values.subcategoryId || undefined,
          attributes: payloadAttributes,
        });
      }
      close();
      onSaved?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to save ticket.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={mode === "create" ? "Create New Ticket" : "Edit Ticket"} size="md">
      <p className="text-white/80 mb-6">
        {mode === "create" ? "Describe your issue in detail." : "Update the ticket details."}
      </p>

      <TicketFields
        values={values}
        onChange={(next) => setValues(next)}
        data={fieldsData}
        descriptionError={error && !values.description.trim() ? "Description is required" : undefined}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <ModalActions>
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={saving}>
          {mode === "create" ? "Create Ticket" : "Save Changes"}
        </Button>
      </ModalActions>
    </Modal>
  );
}
