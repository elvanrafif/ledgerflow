import type { ReactNode } from "react";

/** Shared frame for the auth pages: one focal card, brand mark, minimal chrome. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-5)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            LedgerFlow
          </span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 650, letterSpacing: "-0.01em" }}>{title}</h1>
          {subtitle ? <p style={{ margin: 0, color: "var(--text-secondary)" }}>{subtitle}</p> : null}
        </header>
        {children}
        {footer ? <footer style={{ color: "var(--text-secondary)", fontSize: 14 }}>{footer}</footer> : null}
      </div>
    </main>
  );
}
