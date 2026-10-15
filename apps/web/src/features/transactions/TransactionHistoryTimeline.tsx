import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS } from "@/lib/status-labels";
import type { TransactionHistoryEntry } from "@/lib/types";

/** Status history as a timeline: previous → new, when, and any note. */
export function TransactionHistoryTimeline({ entries }: { entries: TransactionHistoryEntry[] }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {entries.map((entry, index) => (
        <li
          key={`${entry.status}-${entry.createdAt}-${index}`}
          style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}
        >
          <span
            aria-hidden="true"
            style={{ marginTop: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--interactive-primary)", flexShrink: 0 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              {entry.previousStatus ? (
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{STATUS_LABELS[entry.previousStatus]} →</span>
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Created as</span>
              )}
              <StatusBadge status={entry.status} />
            </span>
            <time dateTime={entry.createdAt} style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {new Date(entry.createdAt).toLocaleString()}
            </time>
            {entry.note ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{entry.note}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
