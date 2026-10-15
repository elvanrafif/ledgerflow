import { StatusBadge } from "@/components/StatusBadge";
import type { TransactionStatus } from "@/lib/types";

const STATUS_ORDER: TransactionStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

/** Counts by status — secondary to the totals, always showing all four statuses. */
export function StatusBreakdown({
  byStatus,
  total,
}: {
  byStatus: Record<TransactionStatus, number>;
  total: number;
}) {
  return (
    <section aria-labelledby="status-heading" style={{ marginTop: "var(--space-5)" }}>
      <h2 id="status-heading" style={sectionHeading}>
        Transactions by status
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            style={{
              background: "var(--surface-default)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <StatusBadge status={status} />
            <span className="amount" style={{ fontSize: 26, fontWeight: 600 }}>
              {byStatus[status] ?? 0}
            </span>
          </div>
        ))}
      </div>
      <p style={{ margin: "var(--space-3) 0 0", color: "var(--text-muted)", fontSize: 13 }}>
        {total} transaction{total === 1 ? "" : "s"} in total.
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
