"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { Amount } from "@/components/Amount";
import { Button } from "@/components/Button";
import { buttonLinkStyle } from "@/components/button-link";
import { buildQuery, hasActiveFilters, type ListFilters } from "@/lib/list-filters";
import type { TransactionListResponse } from "@/lib/types";

/**
 * The transaction list. Filters, search, sort and page live in the URL, so the
 * view is shareable and survives a reload. All state changes push a new URL; the
 * server component above re-renders this with the new searchParams.
 */
export function TransactionList({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const router = useRouter();
  const filters = readFilters(searchParams);

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: TransactionListResponse }
  >({ kind: "loading" });

  const query = buildQuery(filters);

  const load = useCallback(() => {
    let active = true;
    setState({ kind: "loading" });
    apiFetch<TransactionListResponse>(`/transactions?${query}`)
      .then((data) => {
        if (active) setState({ kind: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          kind: "error",
          message: error instanceof ApiError ? error.message : "Could not load transactions",
        });
      });
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => load(), [load]);

  function navigate(overrides: Partial<ListFilters>) {
    const next = buildQuery({ ...filters, ...overrides }, { resetPage: true });
    router.push(`/transactions${next ? `?${next}` : ""}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>Transactions</h1>
          <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)" }}>
            Filter, search and sort to find the one you need.
          </p>
        </div>
        <Link href="/transactions/new" style={buttonLinkStyle("primary")}>
          New transaction
        </Link>
      </header>

      <div
        role="search"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          alignItems: "flex-end",
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
        }}
      >
        <label style={controlLabel}>
          <span style={controlLabelText}>Search</span>
          <input
            className="field__input"
            type="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Reference or description"
            onKeyDown={(event) => {
              if (event.key === "Enter") navigate({ search: (event.target as HTMLInputElement).value });
            }}
          />
        </label>

        <label style={controlLabel}>
          <span style={controlLabelText}>Status</span>
          <select
            className="field__input"
            name="status"
            value={filters.status ?? ""}
            onChange={(event) => navigate({ status: event.target.value || undefined })}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>

        <label style={controlLabel}>
          <span style={controlLabelText}>Sort</span>
          <select
            className="field__input"
            name="sort"
            value={filters.sort ?? "createdAt:desc"}
            onChange={(event) => navigate({ sort: event.target.value })}
          >
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
          </select>
        </label>

        {hasActiveFilters(filters) ? (
          <Button variant="ghost" onClick={() => navigate({ status: undefined, search: undefined })}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {state.kind === "loading" ? <LoadingState label="Loading transactions" /> : null}
      {state.kind === "error" ? (
        <ErrorState title="Could not load transactions" message={state.message} action={<Button onClick={load}>Try again</Button>} />
      ) : null}
      {state.kind === "ready" ? (
        <ReadyState data={state.data} filters={filters} onPage={(page) => navigate({ page })} />
      ) : null}
    </div>
  );
}

function ReadyState({
  data,
  filters,
  onPage,
}: {
  data: TransactionListResponse;
  filters: ListFilters;
  onPage: (page: number) => void;
}) {
  if (data.transactions.length === 0) {
    // Two empty states that read differently: nothing exists vs nothing matched.
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

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div style={{ overflowX: "auto", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "var(--surface-default)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <caption style={visuallyHidden}>Transactions</caption>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Status</Th>
              <Th align="right">Amount</Th>
              <Th>Description</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((transaction) => (
              <tr key={transaction.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                <Td>
                  <Link
                    href={`/transactions/${transaction.id}`}
                    style={{ color: "var(--interactive-primary)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}
                  >
                    {transaction.reference}
                  </Link>
                </Td>
                <Td>
                  <StatusBadge status={transaction.status} />
                </Td>
                <Td align="right">
                  <Amount value={transaction.amount} currency={transaction.currency} showCode />
                </Td>
                <Td>{transaction.description}</Td>
                <Td>
                  <time dateTime={transaction.createdAt}>{new Date(transaction.createdAt).toISOString().slice(0, 10)}</time>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Page {data.page} of {totalPages} · {data.total} total
        </span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="secondary" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
            Previous
          </Button>
          <Button variant="secondary" disabled={data.page >= totalPages} onClick={() => onPage(data.page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      style={{
        textAlign: align,
        padding: "var(--space-3) var(--space-4)",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td style={{ textAlign: align, padding: "var(--space-3) var(--space-4)", verticalAlign: "middle" }}>{children}</td>;
}

const controlLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const controlLabelText: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" };
const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function readFilters(searchParams: Record<string, string | string[] | undefined>): ListFilters {
  const one = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));
  return {
    status: one("status"),
    search: one("search"),
    sort: one("sort"),
    page: Number.isFinite(page) && page > 0 ? page : undefined,
  };
}
