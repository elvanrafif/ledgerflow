import Link from "next/link";
import { Button } from "@/components/Button";
import { buttonLinkStyle } from "@/components/button-link";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { hasActiveFilters, type ListFilters } from "@/lib/list-filters";

/**
 * The list's non-table states. Two empty states read differently on purpose:
 * "nothing exists yet" (offer the action that fills it) vs "no matches for these
 * filters" (offer to loosen them).
 */
export function TransactionListStates({
  kind,
  filters,
  errorMessage,
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  filters: ListFilters;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  if (kind === "loading") return <LoadingState label="Loading transactions" />;

  if (kind === "error") {
    return (
      <ErrorState
        title="Could not load transactions"
        message={errorMessage ?? "Could not load transactions"}
        action={onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined}
      />
    );
  }

  return hasActiveFilters(filters) ? (
    <EmptyState
      title="No transactions match these filters"
      body="Try a different status or search term, or clear the filters to see everything."
    />
  ) : (
    <EmptyState
      title="No transactions yet"
      body="Record your first transaction and it will appear here."
      action={
        <Link href="/transactions/new" style={buttonLinkStyle("primary")}>
          New transaction
        </Link>
      }
    />
  );
}
