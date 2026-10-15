"use client";

import { readFilters } from "@/lib/list-filters";
import { useListNavigation } from "@/features/transactions/use-list-navigation";
import { useTransactionList } from "@/features/transactions/use-transaction-list";
import { TransactionListHeader } from "@/features/transactions/TransactionListHeader";
import { TransactionFilterBar } from "@/features/transactions/TransactionFilterBar";
import { TransactionListStates } from "@/features/transactions/TransactionListStates";
import { TransactionTable } from "@/features/transactions/TransactionTable";
import { TransactionPagination } from "@/features/transactions/TransactionPagination";

/**
 * The transaction list page. Composes the URL-state hook, the fetch hook, and
 * the presentational pieces; it holds no fetch logic or layout detail itself.
 */
export function TransactionList({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = readFilters(searchParams);
  const { navigate } = useListNavigation(filters);
  const { state, reload } = useTransactionList(filters);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <TransactionListHeader />
      <TransactionFilterBar filters={filters} onNavigate={navigate} />

      {state.kind === "loading" ? <TransactionListStates kind="loading" filters={filters} /> : null}
      {state.kind === "error" ? (
        <TransactionListStates kind="error" filters={filters} errorMessage={state.message} onRetry={reload} />
      ) : null}
      {state.kind === "ready" && state.data.transactions.length === 0 ? (
        <TransactionListStates kind="empty" filters={filters} />
      ) : null}
      {state.kind === "ready" && state.data.transactions.length > 0 ? (
        <>
          <TransactionTable transactions={state.data.transactions} />
          <TransactionPagination data={state.data} onPage={(page) => navigate({ page })} />
        </>
      ) : null}
    </div>
  );
}

export { readFilters };
