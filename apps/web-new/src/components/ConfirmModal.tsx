"use client";

import React from "react";

type ConfirmModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmStyle?: "danger" | "primary";
  isProcessing?: boolean;
};

export function ConfirmModal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  confirmStyle = "danger",
  isProcessing = false,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`px-6 py-2 text-white font-medium rounded-lg transition-colors ${
                confirmStyle === "danger"
                  ? "bg-red-600 hover:bg-red-700 disabled:bg-red-600/50"
                  : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50"
              }`}
            >
              {isProcessing ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
