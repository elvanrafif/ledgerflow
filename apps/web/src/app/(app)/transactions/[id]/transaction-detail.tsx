"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Amount } from "@/components/Amount";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { isConsequential, isEditable, permittedTransitions } from "@/lib/transitions";
import type { TransactionDetail as TransactionDetailData, TransactionStatus } from "@/lib/types";

const LABELS: Record<TransactionStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function TransactionDetail({ transaction }: { transaction: TransactionDetailData }) {
  const [current, setCurrent] = useState(transaction);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<TransactionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const [description, setDescription] = useState(transaction.description);
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
          {
            previousStatus: prev.status,
            status: next,
            note: null,
            changedById: "",
            createdAt: new Date().toISOString(),
          },
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

  function requestTransition(next: TransactionStatus) {
    setError(null);
    if (isConsequential(next)) {
      setPending(next); // ask first
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link href="/transactions" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          ← Back to transactions
        </Link>
      </div>

      {error ? <ErrorState message={error} /> : null}

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            {current.reference}
          </span>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>{current.description}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <StatusBadge status={current.status} />
            <Amount value={current.amount} currency={current.currency} showCode />
          </div>
        </div>
      </header>

      <section
        aria-labelledby="actions-heading"
        style={{
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
        }}
      >
        <h2 id="actions-heading" style={sectionHeading}>
          Actions
        </h2>
        {moves.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            This transaction is {LABELS[current.status].toLowerCase()}; no further changes are possible.
          </p>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {moves.map((move) => (
              <Button
                key={move}
                variant={move === "FAILED" ? "danger" : "primary"}
                onClick={() => requestTransition(move)}
              >
                {LABELS[move]}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="description-heading"
        style={{
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
        }}
      >
        <h2 id="description-heading" style={sectionHeading}>
          Description
        </h2>
        {isEditable(current.status) ? (
          editing ? (
            <form onSubmit={saveDescription} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <Field
                label="Description"
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <Button type="submit" variant="primary" loading={saveBusy}>
                  Save description
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDescription(current.description);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
              <p style={{ margin: 0 }}>{current.description}</p>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit description
              </Button>
            </div>
          )
        ) : (
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Only pending transactions can be edited.
          </p>
        )}
      </section>

      <section
        aria-labelledby="history-heading"
        style={{
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
        }}
      >
        <h2 id="history-heading" style={sectionHeading}>
          Status history
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {current.history.map((entry, index) => (
            <li
              key={`${entry.status}-${entry.createdAt}-${index}`}
              style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}
            >
              <span aria-hidden="true" style={{ marginTop: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--interactive-primary)", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {entry.previousStatus ? (
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{LABELS[entry.previousStatus]} →</span>
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
      </section>

      <ConfirmDialog
        open={pending !== null}
        title={`Move to ${pending ? LABELS[pending] : ""}?`}
        body="This change cannot be undone. The transaction will be final in its new status."
        confirmLabel={pending ? LABELS[pending] : "Confirm"}
        destructive={pending === "FAILED"}
        busy={busy}
        onConfirm={() => pending && void applyTransition(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text-secondary)",
};
