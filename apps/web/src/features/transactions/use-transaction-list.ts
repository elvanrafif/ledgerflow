"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { buildQuery, type ListFilters } from "@/lib/list-filters";
import type { TransactionListResponse } from "@/lib/types";

/** The list's view state as a small state machine (no half-loaded screens). */
export type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: TransactionListResponse };

/**
 * Fetch the transaction page described by `filters`. Owns the request lifecycle
 * (loading → ready/error) and re-fetches whenever the filters change. The list
 * UI renders whatever state this returns and never talks to the API itself.
 */
export function useTransactionList(filters: ListFilters): { state: ListState; reload: () => void } {
  const [state, setState] = useState<ListState>({ kind: "loading" });
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

  return { state, reload: load };
}
