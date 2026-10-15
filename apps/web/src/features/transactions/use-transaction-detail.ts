"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { isConsequential, isEditable, permittedTransitions } from "@/lib/transitions";
import { transactionKeys } from "./query-keys";
import type { TransactionDetail as TransactionDetailData, TransactionStatus } from "@/lib/types";

/**
 * Detail state machine. TanStack Query owns the two write lifecycles
 * (transition, description edit) as mutations; the rendered copy stays in local
 * state because the status history is assembled client-side (the API returns the
 * row without history on mutations). Surfaces API errors — notably a 409 when the
 * status changed in another tab — instead of swallowing them.
 */
export function useTransactionDetail(initial: TransactionDetailData) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<TransactionStatus | null>(null);

  const [description, setDescription] = useState(initial.description);
  const [editing, setEditing] = useState(false);

  const moves = permittedTransitions(current.status);

  const transition = useMutation({
    mutationFn: (next: TransactionStatus) =>
      apiFetch<{ transaction: TransactionDetailData }>(`/transactions/${current.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: (response, next) => {
      // The API returns the row without history; keep existing history and append.
      setCurrent((prev) => ({
        ...prev,
        ...response.transaction,
        history: [
          ...prev.history,
          { previousStatus: prev.status, status: next, note: null, changedById: "", createdAt: new Date().toISOString() },
        ],
      }));
      setPending(null);
      // The list may now show a different status for this row.
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (caught) => {
      // A 409 means the status changed elsewhere; surface it, do not swallow it.
      setError(caught instanceof ApiError ? caught.message : "Could not change the status");
      setPending(null);
    },
    onMutate: () => setError(null),
  });

  const save = useMutation({
    mutationFn: (nextDescription: string) =>
      apiFetch<{ transaction: TransactionDetailData }>(`/transactions/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: nextDescription.trim() }),
      }),
    onSuccess: (response) => {
      setCurrent((prev) => ({ ...prev, ...response.transaction, history: prev.history }));
      setEditing(false);
      // The list caches descriptions too; refresh it so the edited text shows.
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not save the description");
    },
    onMutate: () => setError(null),
  });

  /** Terminal moves ask for confirmation first; others apply immediately. */
  function requestTransition(next: TransactionStatus) {
    setError(null);
    if (isConsequential(next)) {
      setPending(next);
      return;
    }
    transition.mutate(next);
  }

  function saveDescription(event: React.FormEvent) {
    event.preventDefault();
    save.mutate(description);
  }

  function cancelEdit() {
    setDescription(current.description);
    setEditing(false);
  }

  return {
    current,
    error,
    moves,
    editable: isEditable(current.status),
    pending,
    busy: transition.isPending,
    description,
    setDescription,
    editing,
    setEditing,
    saveBusy: save.isPending,
    requestTransition,
    confirmTransition: () => pending !== null && transition.mutate(pending),
    cancelTransition: () => setPending(null),
    saveDescription,
    cancelEdit,
  };
}
