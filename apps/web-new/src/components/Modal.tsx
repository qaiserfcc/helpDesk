"use client";

import React from "react";

type ModalProps = {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  maxWidthClass?: string; // e.g., "max-w-lg", "max-w-2xl", "max-w-3xl"
  bodyClassName?: string; // optional extra classes for the scrollable body
};

export function Modal({
  title,
  children,
  onClose,
  actions,
  maxWidthClass = "max-w-lg",
  bodyClassName = "",
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10 bg-black/60">
      <div className={`w-full ${maxWidthClass}`}>
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {title ? (
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h2>
            </div>
          ) : null}

          <div
            className={`px-6 py-4 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] ${bodyClassName}`.trim()}
          >
            {children}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
