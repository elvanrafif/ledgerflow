import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a busy state and disables the button while an action is in flight. */
  loading?: boolean;
}

export function Button({
  variant = "secondary",
  loading = false,
  disabled,
  children,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Native button retains keyboard activation (Enter / Space) for free.
      type={type}
      className={["button", className].filter(Boolean).join(" ")}
      data-variant={variant}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
