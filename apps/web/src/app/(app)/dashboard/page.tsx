import Link from "next/link";
import { serverFetch } from "@/lib/server-fetch";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { buttonLinkStyle } from "@/components/button-link";
import { DashboardHeading } from "@/features/dashboard/DashboardHeading";
import { CurrencyTotalsCard } from "@/features/dashboard/CurrencyTotalsCard";
import { StatusBreakdown } from "@/features/dashboard/StatusBreakdown";
import type { DashboardSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Dashboard (Server Component). Fetches its own summary and composes the
 * presentational pieces; all figures come from the API, never fabricated.
 */
export default async function DashboardPage() {
  let summary: DashboardSummary;
  try {
    summary = await serverFetch<DashboardSummary>("/dashboard/summary");
  } catch (error) {
    // Log the underlying cause server-side; the UI only shows a friendly message.
    console.error(JSON.stringify({ level: "error", route: "/dashboard", code: "SUMMARY_FETCH_FAILED", message: error instanceof Error ? error.message : String(error) }));
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
        <DashboardHeading />
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
      <DashboardHeading />
      <CurrencyTotalsCard totals={summary.totalsByCurrency} />
      <StatusBreakdown byStatus={summary.byStatus} total={summary.total} />
    </>
  );
}
