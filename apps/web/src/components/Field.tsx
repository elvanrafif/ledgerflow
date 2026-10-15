import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

/**
 * Field: a label + control + error, wired for accessibility.
 *
 * - The label is a real <label> bound to the control via htmlFor/id, so
 *   `getByLabelText` and screen readers both work.
 * - The error is linked with aria-describedby and the control is marked
 *   aria-invalid, so the message is announced, not just shown.
 */

interface FieldBaseProps {
  label: string;
  error?: string | string[] | null;
  hint?: string;
}

function errorText(error: FieldBaseProps["error"]): string | null {
  if (!error) return null;
  return Array.isArray(error) ? (error[0] ?? null) : error;
}

export interface FieldProps extends FieldBaseProps, InputHTMLAttributes<HTMLInputElement> {}

export function Field({ label, error, hint, id, className, ...rest }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const message = errorText(error);
  const describedBy = [hint ? hintId : null, message ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      {hint ? (
        <span className="field__hint" id={hintId} style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {hint}
        </span>
      ) : null}
      <input
        id={fieldId}
        className="field__input"
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {message ? (
        <span className="field__error" id={errorId} role="alert">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps extends FieldBaseProps, SelectHTMLAttributes<HTMLSelectElement> {}

/** A labelled <select> used for currency, status filter, and similar choices. */
export function SelectField({ label, error, hint, id, className, children, ...rest }: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const message = errorText(error);
  const describedBy = [hint ? hintId : null, message ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      {hint ? (
        <span className="field__hint" id={hintId} style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {hint}
        </span>
      ) : null}
      <select
        id={fieldId}
        className="field__input"
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      >
        {children}
      </select>
      {message ? (
        <span className="field__error" id={errorId} role="alert">
          {message}
        </span>
      ) : null}
    </div>
  );
}
