"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";

interface DemoCredentialsPopoverProps {
  onFill?: (email: string, password: string) => void;
}

export function DemoCredentialsPopover({ onFill }: DemoCredentialsPopoverProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const demoEmail = "ledgerflow.sample@example.test";
  const demoPassword = "iniakundemo";

  function handleMouseEnter() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  }

  function handleMouseLeave() {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  async function handleCopy(text: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Fallback if clipboard API is restricted
    }
  }

  function handleFill() {
    if (onFill) {
      onFill(demoEmail, demoPassword);
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 2000);
    }
  }

  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        aria-label="Demo login information"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((prev) => !prev)}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "1px solid var(--border-default)",
          background: isOpen ? "var(--surface-sunken)" : "var(--surface-default)",
          color: isOpen ? "var(--interactive-primary)" : "var(--text-muted)",
          cursor: "pointer",
          padding: 0,
          transition: "all var(--transition-fast)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Demo Account Credentials"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 100,
            width: 280,
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              Demo Account
            </span>
            <span
              style={{
                fontSize: 11,
                background: "var(--status-processing-bg)",
                color: "var(--status-processing-fg)",
                border: "1px solid var(--status-processing-border)",
                padding: "1px 6px",
                borderRadius: "var(--radius-sm)",
                fontWeight: 500,
              }}
            >
              Testing
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>Email</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{demoEmail}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(demoEmail, "email")}
                  title="Copy email"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--interactive-primary)",
                    padding: "2px 4px",
                    fontWeight: 500,
                  }}
                >
                  {copiedField === "email" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>Password</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>{demoPassword}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(demoPassword, "password")}
                  title="Copy password"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--interactive-primary)",
                    padding: "2px 4px",
                    fontWeight: 500,
                  }}
                >
                  {copiedField === "password" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {onFill ? (
            <button
              type="button"
              onClick={handleFill}
              style={{
                width: "100%",
                background: autoFilled ? "var(--status-completed-bg)" : "var(--surface-subtle)",
                color: autoFilled ? "var(--status-completed-fg)" : "var(--interactive-primary)",
                border: `1px solid ${autoFilled ? "var(--status-completed-border)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 550,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              {autoFilled ? "✓ Credentials Filled" : "Auto-fill to Form"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
