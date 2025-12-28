"use client";

import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

/**
 * Generic Form Field Component
 * Consistent styling for form inputs across the application
 */
export function FormField({
  label,
  error,
  helperText,
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-1">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        {...props}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white/5 text-white placeholder-white/50 transition-all ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-white/10 focus:ring-primary-blue"
        } ${className}`}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-white/60 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
}

export interface FormSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * Generic Form Select Component
 * Consistent styling for select inputs across the application
 */
export function FormSelect({
  label,
  error,
  helperText,
  options,
  className = "",
  ...props
}: FormSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-1">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        {...props}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white/5 text-white transition-all ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-white/10 focus:ring-primary-blue"
        } ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-white/60 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
}

export interface FormTextAreaProps
  extends InputHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  rows?: number;
}

/**
 * Generic Form TextArea Component
 */
export function FormTextArea({
  label,
  error,
  helperText,
  rows = 4,
  className = "",
  ...props
}: FormTextAreaProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-1">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        {...(props as any)}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white/5 text-white placeholder-white/50 transition-all resize-none ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-white/10 focus:ring-primary-blue"
        } ${className}`}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-white/60 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
}
