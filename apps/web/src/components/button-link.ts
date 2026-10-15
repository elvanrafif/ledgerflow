import type { CSSProperties } from "react";
import type { ButtonVariant } from "./Button";

/**
 * Style for an <a>/<Link> that should look like a Button. Kept next to Button so
 * the two stay visually identical; a real Button cannot be used for navigation
 * because it would need an onClick + router.push instead of a real href.
 */
export function buttonLinkStyle(variant: ButtonVariant = "secondary"): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "0 var(--space-4)",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  };

  switch (variant) {
    case "primary":
      return { ...base, background: "var(--interactive-primary)", color: "var(--text-inverse)" };
    case "danger":
      return { ...base, background: "var(--status-failed-fg)", color: "var(--text-inverse)" };
    case "ghost":
      return { ...base, background: "transparent", color: "var(--text-secondary)" };
    default:
      return {
        ...base,
        background: "var(--surface-default)",
        color: "var(--text-primary)",
        borderColor: "var(--border-strong)",
      };
  }
}
