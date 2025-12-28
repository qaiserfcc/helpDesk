"use client";

import { useState, useEffect } from "react";
import { Modal, ModalActions } from "@/components/Modal";
import { FormTextArea } from "@/components/FormField";
import { Button } from "@/components/Button";
import {
  createTicket,
  updateTicket,
  type TicketPriority,
  type IssueType,
  type CreateTicketPayload,
} from "@/services/tickets";
import { useTicketModalStore } from "@/store/useTicketModalStore";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = ["hardware", "software", "network", "access", "other"];

type FormValues = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
};

const makeEmpty = (): FormValues => ({
  description: "",
  priority: "medium",
  issueType: "other",
});

export function TicketFormModal() {
  const { isOpen, mode, ticket, onSaved, close } = useTicketModalStore();
  const [values, setValues] = useState<FormValues>(makeEmpty());
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && ticket) {
        setValues({
          description: ticket.description,
          priority: ticket.priority,
          issueType: ticket.issueType,
        });
      } else {
        setValues(makeEmpty());
      }
      setError("");
      setSaving(false);
    }
  }, [isOpen, mode, ticket]);

  const handleSubmit = async () => {
    if (!values.description.trim()) {
      setError("Description is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (mode === "create") {
        const payload: CreateTicketPayload = {
          description: values.description.trim(),
          priority: values.priority,
          issueType: values.issueType,
        };
        await createTicket(payload);
      } else if (mode === "edit" && ticket) {
        await updateTicket(ticket.id, {
          description: values.description.trim(),
          priority: values.priority,
          issueType: values.issueType,
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

      <FormTextArea
        label="Description"
        placeholder="Describe the issue in detail..."
        value={values.description}
        onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
        error={error && !values.description.trim() ? "Description is required" : undefined}
        required
        rows={6}
      />

      {/* Priority Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white/90 mb-3">
          Priority <span className="text-red-400 ml-1">*</span>
        </label>
        <div className="flex space-x-3">
          {priorityOptions.map((option) => {
            const selected = values.priority === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, priority: option }))}
                className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${selected ? "bg-sky-500 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Issue Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white/90 mb-3">
          Issue Type <span className="text-red-400 ml-1">*</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {issueOptions.map((option) => {
            const selected = values.issueType === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, issueType: option }))}
                className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${selected ? "bg-sky-500 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

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
