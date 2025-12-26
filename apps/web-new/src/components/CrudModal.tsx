"use client";

import React from "react";

type CrudModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  formId?: string;
};

/**
 * Centralized CRUD Modal Component with 2-column layout
 * Used across all management pages for consistent UI/UX
 */
export function CrudModal({
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = "Save",
  isSubmitting = false,
  formId = "crud-form",
}: CrudModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {title}
            </h2>
          </div>

          {/* Form Body with 2-column grid layout */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh] sm:max-h-[70vh]">
            <form
              id={formId}
              onSubmit={onSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {children}
            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              form={formId}
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
