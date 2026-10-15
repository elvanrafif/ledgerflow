"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { buildQuery, type ListFilters } from "@/lib/list-filters";
import { transactionKeys } from "./query-keys";
import type { TransactionListResponse } from "@/lib/types";

/** The list's view state as a small state machine (no half-loaded screens). */
export type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: TransactionListResponse };

/**
 * Fetch the transaction page described by `filters`. TanStack Query owns the
 * request lifecycle and cache; this hook maps its state onto the same
 * `loading | error | ready` shape the list UI already renders, so no
 * presentational component changes.
 */
export function useTransactionList(filters: ListFilters): { state: ListState; reload: () => void } {
  const query = buildQuery(filters);
  const result = useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => apiFetch<TransactionListResponse>(`/transactions?${query}`),
  });

  const state: ListState = result.isPending
    ? { kind: "loading" }
    : result.isError
      ? {
          kind: "error",
          message: result.error instanceof ApiError ? result.error.message : "Could not load transactions",
        }
      : { kind: "ready", data: result.data };

  return { state, reload: () => void result.refetch() };
}
