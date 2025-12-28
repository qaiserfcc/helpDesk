"use client";

import React from "react";
import { Modal } from "./Modal";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "email" | "password" | "checkbox" | "date";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  value?: string | number | boolean;
  onChange?: (value: any) => void;
  error?: string;
  disabled?: boolean;
  span?: 1 | 2; // 1 = single column, 2 = full width
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function FormModal({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  isSubmitting = false,
  size = "xl",
}: FormModalProps) {
  const renderField = (field: FormField) => {
    const baseInputClasses =
      "w-full px-3 py-2 rounded-md border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    const fieldWrapper = (content: React.ReactNode) => (
      <div
        key={field.name}
        className={field.span === 2 ? "col-span-2" : "col-span-1"}
      >
        <label className="block text-sm font-medium text-white mb-2">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {content}
        {field.error && (
          <p className="mt-1 text-sm text-red-400">{field.error}</p>
        )}
      </div>
    );

    switch (field.type) {
      case "textarea":
        return fieldWrapper(
          <textarea
            name={field.name}
            value={field.value as string}
            onChange={(e) => field.onChange?.(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={field.disabled}
            rows={4}
            className={baseInputClasses}
          />
        );

      case "select":
        return fieldWrapper(
          <select
            name={field.name}
            value={field.value as string}
            onChange={(e) => field.onChange?.(e.target.value)}
            required={field.required}
            disabled={field.disabled}
            className={baseInputClasses}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return fieldWrapper(
          <div className="flex items-center">
            <input
              type="checkbox"
              name={field.name}
              checked={field.value as boolean}
              onChange={(e) => field.onChange?.(e.target.checked)}
              disabled={field.disabled}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-white/80">
              {field.placeholder}
            </span>
          </div>
        );

      default:
        return fieldWrapper(
          <input
            type={field.type}
            name={field.name}
            value={field.value as string | number}
            onChange={(e) => field.onChange?.(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={field.disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {fields.map(renderField)}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-btn px-4 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
