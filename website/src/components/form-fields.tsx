"use client";

import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";

type BaseFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  onEnter?: () => void;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  autoComplete,
  placeholder,
  disabled,
  type = "text",
  inputMode,
  onEnter,
}: BaseFieldProps & { type?: string; inputMode?: "text" | "tel" | "email" | "numeric" }) {
  const describedby = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" *"}
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        className={`input ${error ? "input-invalid" : ""}`}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedby || undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (onEnter && event.key === "Enter") {
            event.preventDefault();
            onEnter();
          }
        }}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  rows = 3,
  placeholder,
  disabled,
}: Omit<BaseFieldProps, "autoComplete" | "onEnter" | "type" | "inputMode"> & { rows?: number }) {
  const describedby = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        className={`input resize-none ${error ? "input-invalid" : ""}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedby || undefined}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        onBlur={(event: FocusEvent<HTMLTextAreaElement>) => onBlur?.()}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
