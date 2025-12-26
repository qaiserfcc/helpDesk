"use client";

import React from "react";

type ModalProps = {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  maxWidthClass?: string; // e.g., "max-w-lg", "max-w-2xl", "max-w-3xl"
};

export function Modal({ title, children, onClose, actions, maxWidthClass = "max-w-lg" }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`bg-white rounded-xl p-6 ${maxWidthClass} w-full my-8 shadow-2xl`}>
        {title ? <h2 className="text-2xl font-bold mb-4 text-gray-900">{title}</h2> : null}
        <div>{children}</div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
}
