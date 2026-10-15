import { Amount } from "@/components/Amount";
import type { Currency } from "@/lib/types";

/**
 * Per-currency totals — the reason to open the dashboard, so it leads. Each
 * currency gets its own row; they are never combined into one figure.
 */
export function CurrencyTotalsCard({ totals }: { totals: { currency: Currency; total: string }[] }) {
  return (
    <section
      aria-labelledby="totals-heading"
      style={{
        background: "var(--surface-default)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <h2 id="totals-heading" style={sectionHeading}>
        Totals by currency
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-4)" }}>
        {totals.map((entry) => (
          <li
            key={entry.currency}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              {entry.currency}
            </span>
            <Amount value={entry.total} currency={entry.currency} />
          </li>
        ))}
      </ul>
      <p style={{ margin: "var(--space-3) 0 0", color: "var(--text-muted)", fontSize: 13 }}>
        Totals are shown per currency. Amounts in different currencies are never combined.
      </p>
    </section>
  );
}

const sectionHeading: React.CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text-secondary)",
};
