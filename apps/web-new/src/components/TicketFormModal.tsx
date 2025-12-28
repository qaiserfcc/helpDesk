"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { fetchVisibleAttributes } from "@/services/attributes";
import type { Attribute, AttributeType } from "@/services/tickets";
import { useTicketModalStore } from "@/store/useTicketModalStore";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = ["hardware", "software", "network", "access", "other"];

type FormValues = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
  attributes: Record<string, unknown>;
};

const makeEmpty = (): FormValues => ({
  description: "",
  priority: "medium",
  issueType: "other",
  attributes: {},
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

  const { data: attributes = [], isLoading: attributesLoading, isError: attributesError } = useQuery({
    queryKey: ["ticket-attributes"],
    queryFn: fetchVisibleAttributes,
    enabled: isOpen,
  });

  const sortedAttributes = useMemo(() => {
    return [...attributes].sort((a, b) => a.order - b.order);
  }, [attributes]);

  const handleAttributeChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, attributes: { ...prev.attributes, [key]: value } }));
  };

  const handleSubmit = async () => {
    if (!values.description.trim()) {
      setError("Description is required");
      return;
    }

    if (attributesError) {
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
          attributes: payloadAttributes,
        };
        await createTicket(payload);
      } else if (mode === "edit" && ticket) {
        await updateTicket(ticket.id, {
          description: values.description.trim(),
          priority: values.priority,
          issueType: values.issueType,
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

      {/* Dynamic Attributes */}
      {attributesLoading && (
        <p className="text-white/70 text-sm mb-4">Loading fields...</p>
      )}

      {attributesError && (
        <p className="text-red-400 text-sm mb-4">Unable to load custom fields. You can still submit core details.</p>
      )}

      {!attributesLoading && sortedAttributes.length > 0 && (
        <div className="space-y-4 mb-6">
          {sortedAttributes.map((attr) => (
            <AttributeField
              key={attr.id}
              attribute={attr}
              value={values.attributes[attr.key]}
              onChange={(val) => handleAttributeChange(attr.key, val)}
            />
          ))}
        </div>
      )}

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

type AttributeFieldProps = {
  attribute: Attribute;
  value: unknown;
  onChange: (value: unknown) => void;
};

function AttributeField({ attribute, value, onChange }: AttributeFieldProps) {
  const label = (
    <label className="block text-sm font-medium text-white/90 mb-2">
      {attribute.label}
      {attribute.required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );

  const baseInputClasses = "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:border-sky-400 focus:outline-none";

  switch (attribute.type as AttributeType) {
    case "text":
      return (
        <div>
          {label}
          <input
            type="text"
            className={baseInputClasses}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={attribute.label}
          />
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            className={baseInputClasses}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={attribute.label}
          />
        </div>
      );
    case "date":
      return (
        <div>
          {label}
          <input
            type="date"
            className={baseInputClasses}
            value={value ? String(value).slice(0, 10) : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={attribute.label}
          />
        </div>
      );
    case "select":
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {attribute.options.map((option: string) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(option)}
                  className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${
                    selected ? "bg-sky-500 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      );
    case "multiselect": {
      const current = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (option: string) => {
        if (current.includes(option)) {
          onChange(current.filter((v) => v !== option));
        } else {
          onChange([...current, option]);
        }
      };
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {attribute.options.map((option: string) => {
              const selected = current.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${
                    selected ? "bg-sky-500 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
