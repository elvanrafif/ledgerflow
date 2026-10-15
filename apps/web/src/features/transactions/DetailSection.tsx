import type { ReactNode } from "react";

/** A titled card section used throughout the detail page. */
export function DetailSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      style={{
        background: "var(--surface-default)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <h2 id={`${id}-heading`} style={sectionHeading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const sectionHeading: React.CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text-secondary)",
};
