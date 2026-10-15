"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { isConsequential, isEditable, permittedTransitions } from "@/lib/transitions";
import type { TransactionDetail as TransactionDetailData, TransactionStatus } from "@/lib/types";

/**
 * Detail state machine. Owns the current transaction, the transition request
 * (including the confirmation gate for irreversible moves), and description
 * editing. Surfaces API errors (notably a 409 when the status changed in another
 * tab) instead of swallowing them.
 */
export function useTransactionDetail(initial: TransactionDetailData) {
  const [current, setCurrent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<TransactionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const [description, setDescription] = useState(initial.description);
  const [editing, setEditing] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const moves = permittedTransitions(current.status);

  async function applyTransition(next: TransactionStatus) {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{ transaction: TransactionDetailData }>(
        `/transactions/${current.id}/status`,
        { method: "POST", body: JSON.stringify({ status: next }) },
      );
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
    } catch (caught) {
      // A 409 means the status changed elsewhere; surface it, do not swallow it.
      setError(caught instanceof ApiError ? caught.message : "Could not change the status");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  /** Terminal moves ask for confirmation first; others apply immediately. */
  function requestTransition(next: TransactionStatus) {
    setError(null);
    if (isConsequential(next)) {
      setPending(next);
      return;
    }
    void applyTransition(next);
  }

  async function saveDescription(event: React.FormEvent) {
    event.preventDefault();
    setSaveBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{ transaction: TransactionDetailData }>(
        `/transactions/${current.id}`,
        { method: "PATCH", body: JSON.stringify({ description: description.trim() }) },
      );
      setCurrent((prev) => ({ ...prev, ...response.transaction, history: prev.history }));
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the description");
    } finally {
      setSaveBusy(false);
    }
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
    busy,
    description,
    setDescription,
    editing,
    setEditing,
    saveBusy,
    requestTransition,
    confirmTransition: () => pending && void applyTransition(pending),
    cancelTransition: () => setPending(null),
    saveDescription,
    cancelEdit,
  };
}
