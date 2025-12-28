"use client";

import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
}

/**
 * Generic DataTable Component with glassmorphism design
 * 
 * Reusable table for all listing/CRUD operations across the application.
 * Features:
 * - Glassmorphism design matching the app theme
 * - Loading states
 * - Empty states with optional actions
 * - Row click handlers
 * - Custom column rendering
 * - Action column support
 * - Responsive design
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  emptyMessage = "No data found.",
  emptyAction,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="card shadow rounded-lg p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card shadow rounded-lg p-8">
        <div className="text-center">
          <p className="text-white/80 mb-4">{emptyMessage}</p>
          {emptyAction}
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider ${
                    column.className || ""
                  }`}
                >
                  {column.label}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-white/6">
            {data.map((item) => (
              <tr
                key={getRowKey(item)}
                className={`hover:bg-white/5 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 text-sm text-white ${
                      column.className || ""
                    }`}
                  >
                    {column.render
                      ? column.render(item)
                      : String((item as any)[column.key] ?? "")}
                  </td>
                ))}
                {actions && (
                  <td
                    className="px-6 py-4 text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface DataListProps<T> {
  data: T[];
  getRowKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
}

/**
 * Generic DataList Component for card-based listings
 * Alternative to DataTable for more flexible layouts
 */
export function DataList<T>({
  data,
  getRowKey,
  renderItem,
  isLoading = false,
  emptyMessage = "No data found.",
  emptyAction,
}: DataListProps<T>) {
  if (isLoading) {
    return (
      <div className="card shadow rounded-lg p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card shadow rounded-lg p-8">
        <div className="text-center">
          <p className="text-white/80 mb-4">{emptyMessage}</p>
          {emptyAction}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={getRowKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
