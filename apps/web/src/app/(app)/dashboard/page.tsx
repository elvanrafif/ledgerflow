import Link from "next/link";
import { serverFetch } from "@/lib/server-fetch";
import { Amount } from "@/components/Amount";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { buttonLinkStyle } from "@/components/button-link";
import type { DashboardSummary, TransactionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: TransactionStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

export default async function DashboardPage() {
  let summary: DashboardSummary;
  try {
    summary = await serverFetch<DashboardSummary>("/dashboard/summary");
  } catch {
    return (
      <ErrorState
        title="Could not load your summary"
        message="We could not reach the ledger. Refresh the page to try again."
      />
    );
  }

  if (summary.total === 0) {
    return (
      <>
        <PageHeading />
        <EmptyState
          title="No transactions yet"
          body="Your totals and status counts appear here once you record a transaction."
          action={
            <Link href="/transactions/new" style={buttonLinkStyle("primary")}>
              New transaction
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeading />

      {/* Totals come first: they are the reason to open this page. Each currency
          is shown on its own line. They are never combined. */}
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
          {summary.totalsByCurrency.map((entry) => (
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
              <span style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
                  {entry.currency}
                </span>
              </span>
              <Amount value={entry.total} currency={entry.currency} />
            </li>
          ))}
        </ul>
        <p style={{ margin: "var(--space-3) 0 0", color: "var(--text-muted)", fontSize: 13 }}>
          Totals are shown per currency. Amounts in different currencies are never combined.
        </p>
      </section>

      {/* Status counts: secondary, below the totals. */}
      <section
        aria-labelledby="status-heading"
        style={{ marginTop: "var(--space-5)" }}
      >
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
                {summary.byStatus[status] ?? 0}
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: "var(--space-3) 0 0", color: "var(--text-muted)", fontSize: 13 }}>
          {summary.total} transaction{summary.total === 1 ? "" : "s"} in total.
        </p>
      </section>
    </>
  );
}

const sectionHeading = {
  margin: "0 0 var(--space-4)",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text-secondary)",
} as const;

function PageHeading() {
  return (
    <div style={{ marginBottom: "var(--space-5)" }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>Dashboard</h1>
      <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)" }}>
        Your money and where it stands.
      </p>
    </div>
  );
}
