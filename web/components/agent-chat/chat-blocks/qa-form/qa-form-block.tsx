"use client";

import Icon from "@/components/misc/icon";
import type { QAFormField, QAFormInterruptState } from "@/lib/types";
import { useState } from "react";

export default function QAFormBlock({
  form,
  onSubmit,
  isLoading,
}: {
  form: QAFormInterruptState;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const field of form.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      } else if (field.type === "checkbox" || field.type === "multi-select") {
        initial[field.id] = [];
      } else {
        initial[field.id] = "";
      }
    }
    return initial;
  });
  const [submitted, setSubmitted] = useState(false);

  function setValue(id: string, value: any) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit() {
    setSubmitted(true);
    onSubmit(values);
  }

  if (submitted) {
    return null;
  }

  return (
    <div className="my-3 w-full max-w-xl shrink-0 overflow-hidden rounded-xl border border-purple-200/60 bg-white shadow-sm dark:border-purple-500/20 dark:bg-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-purple-200/40 bg-purple-50/50 px-3.5 py-2 dark:border-purple-500/10 dark:bg-purple-500/5">
        <Icon
          name="dynamic_form"
          variant="round"
          className="text-base text-purple-600 dark:text-purple-400"
        />
        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
          {form.title}
        </span>
      </div>

      {/* Description */}
      {form.description && (
        <div className="px-3.5 pt-3 pb-1">
          <p className="text-xs text-default-500 dark:text-white/50">
            {form.description}
          </p>
        </div>
      )}

      {/* Fields */}
      <div className="flex flex-col gap-3 px-3.5 py-3">
        {form.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(v) => setValue(field.id, v)}
            disabled={isLoading}
          />
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end border-t border-purple-200/40 px-3.5 py-2.5 dark:border-purple-500/10">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  disabled,
}: {
  field: QAFormField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}) {
  const labelEl = (
    <label className="mb-1 block text-xs font-medium text-default-700 dark:text-white/75">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  const descEl = field.description && (
    <p className="mb-1 text-[10px] text-default-400 dark:text-white/35">
      {field.description}
    </p>
  );

  const inputClasses =
    "w-full rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs text-default-800 placeholder:text-default-400 focus:border-purple-400 focus:outline-none disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/85 dark:placeholder:text-white/30";

  switch (field.type) {
    case "text":
    case "number":
    case "date":
      return (
        <div>
          {labelEl}
          {descEl}
          <input
            type={field.type}
            value={value ?? ""}
            onChange={(e) => onChange(field.type === "number" ? e.target.valueAsNumber : e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={inputClasses}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          {labelEl}
          {descEl}
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={3}
            className={inputClasses + " resize-y"}
          />
        </div>
      );

    case "select":
      return (
        <div>
          {labelEl}
          {descEl}
          <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={inputClasses}
          >
            <option value="">{field.placeholder ?? "Select..."}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "multi-select": {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="flex flex-wrap gap-1.5">
            {field.options?.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      isSelected
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value],
                    )
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    isSelected
                      ? "border-purple-400 bg-purple-100 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-300"
                      : "border-default-200 bg-default-50 text-default-600 hover:bg-default-100 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "radio":
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="flex flex-col gap-1.5">
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-xs text-default-700 dark:text-white/70"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  disabled={disabled}
                  className="accent-purple-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      );

    case "checkbox": {
      // Single checkbox (no options) or multi-checkbox
      if (!field.options || field.options.length === 0) {
        return (
          <label className="flex items-center gap-2 text-xs text-default-700 dark:text-white/70">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="accent-purple-600"
            />
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
        );
      }
      const checked: string[] = Array.isArray(value) ? value : [];
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="flex flex-col gap-1.5">
            {field.options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-xs text-default-700 dark:text-white/70"
              >
                <input
                  type="checkbox"
                  checked={checked.includes(opt.value)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...checked, opt.value]
                        : checked.filter((v) => v !== opt.value),
                    )
                  }
                  disabled={disabled}
                  className="accent-purple-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
