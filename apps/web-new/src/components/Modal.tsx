"use client";

import { ReactNode, useEffect } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

/**
 * Generic Modal Component with glassmorphism design
 * 
 * Reusable modal for all CRUD operations across the application.
 * Features:
 * - Glassmorphism design matching the app theme
 * - Backdrop blur effect
 * - Responsive sizing
 * - Keyboard support (ESC to close)
 * - Click outside to close
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  // Handle escape key globally
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div
        className={`card rounded-lg ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto relative z-10 animate-fadeIn`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 id="modal-title" className="text-xl font-semibold text-white">
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white/90 transition-colors p-1 rounded-md hover:bg-white/5"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export interface ModalActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Modal Actions Footer Component
 * For action buttons at the bottom of modals
 */
export function ModalActions({ children, className = "" }: ModalActionsProps) {
  return (
    <div className={`flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10 ${className}`}>
      {children}
    </div>
  );
}
