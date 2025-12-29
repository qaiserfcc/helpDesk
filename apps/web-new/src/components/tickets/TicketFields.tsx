"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormTextArea } from "@/components/FormField";
import { categoriesService } from "@/services/categories";
import { subcategoriesService } from "@/services/subcategories";
import { fetchVisibleAttributes } from "@/services/attributes";
import type {
  Attribute,
  AttributeType,
  IssueType,
  TicketPriority,
} from "@/services/tickets";

export const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
export const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

export type TicketFormValues = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
  categoryId: string;
  subcategoryId: string;
  attributes: Record<string, unknown>;
};

export function useTicketFieldsData(params: {
  enabled: boolean;
  categoryId: string;
}) {
  const { enabled, categoryId } = params;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.listAllCategories(),
    enabled,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: () =>
      categoryId
        ? subcategoriesService.listByCategory(categoryId)
        : Promise.resolve([]),
    enabled: enabled && Boolean(categoryId),
  });

  const attributesQuery = useQuery({
    queryKey: ["ticket-attributes"],
    queryFn: fetchVisibleAttributes,
    enabled,
  });

  const sortedAttributes = useMemo(() => {
    const attributes = attributesQuery.data ?? [];
    return [...attributes].sort((a, b) => a.order - b.order);
  }, [attributesQuery.data]);

  return {
    categories: categoriesQuery.data ?? [],
    subcategories: subcategoriesQuery.data ?? [],
    attributes: sortedAttributes,
    attributesLoading: attributesQuery.isLoading,
    attributesError: attributesQuery.isError,
    categoriesError: categoriesQuery.isError,
  };
}

export function TicketFields(props: {
  values: TicketFormValues;
  onChange: (next: TicketFormValues) => void;
  data: {
    categories: Array<{ id: string; name: string }>;
    subcategories: Array<{ id: string; name: string }>;
    attributes: Attribute[];
    attributesLoading: boolean;
    attributesError: boolean;
    categoriesError: boolean;
  };
  descriptionError?: string;
}) {
  const { values, onChange, data, descriptionError } = props;

  const baseInputClasses =
    "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:border-sky-400 focus:outline-none";

  const handleAttributeChange = (key: string, value: unknown) => {
    onChange({
      ...values,
      attributes: { ...values.attributes, [key]: value },
    });
  };

  return (
    <>
      <FormTextArea
        label="Description"
        placeholder="Describe the issue in detail..."
        value={values.description}
        onChange={(e) => onChange({ ...values, description: e.target.value })}
        error={descriptionError}
        required
        rows={6}
      />

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
                onClick={() => onChange({ ...values, priority: option })}
                className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${
                  selected
                    ? "bg-sky-500 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="category" className="block text-sm font-medium text-white/90 mb-2">
          Category
        </label>
        <select
          id="category"
          value={values.categoryId}
          onChange={(e) =>
            onChange({
              ...values,
              categoryId: e.target.value,
              subcategoryId: "",
            })
          }
          className={baseInputClasses}
        >
          <option value="">-- Select Category --</option>
          {data.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {data.categoriesError && (
          <p className="text-red-400 text-sm mt-2">Unable to load categories.</p>
        )}
      </div>

      {values.categoryId ? (
        <div className="mb-6">
          <label htmlFor="subcategory" className="block text-sm font-medium text-white/90 mb-2">
            Subcategory
          </label>
          <select
            id="subcategory"
            value={values.subcategoryId}
            onChange={(e) => onChange({ ...values, subcategoryId: e.target.value })}
            className={baseInputClasses}
          >
            <option value="">-- Select Subcategory --</option>
            {data.subcategories.map((subcat) => (
              <option key={subcat.id} value={subcat.id}>
                {subcat.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
                onClick={() => onChange({ ...values, issueType: option })}
                className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${
                  selected
                    ? "bg-sky-500 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {data.attributesLoading && (
        <p className="text-white/70 text-sm mb-4">Loading fields...</p>
      )}

      {data.attributesError && (
        <p className="text-red-400 text-sm mb-4">
          Unable to load custom fields. You can still submit core details.
        </p>
      )}

      {!data.attributesLoading && data.attributes.length > 0 && (
        <div className="space-y-4 mb-6">
          {data.attributes.map((attr) => (
            <AttributeField
              key={attr.id}
              attribute={attr}
              value={values.attributes[attr.key]}
              onChange={(val) => handleAttributeChange(attr.key, val)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function AttributeField(props: {
  attribute: Attribute;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { attribute, value, onChange } = props;

  const label = (
    <label className="block text-sm font-medium text-white/90 mb-2">
      {attribute.label}
      {attribute.required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );

  const baseInputClasses =
    "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:border-sky-400 focus:outline-none";

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
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "select":
      return (
        <div>
          {label}
          <select
            className={baseInputClasses}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">-- Select --</option>
            {attribute.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          {label}
          <div className="space-y-2">
            {(attribute.options ?? []).map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, opt]
                        : selected.filter((s) => s !== opt);
                      onChange(next);
                    }}
                  />
                  <span>{opt}</span>
                </label>
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
