import type { TransactionStatus } from "./types";

/**
 * The permitted status transitions, mirrored from the API
 * (apps/api/src/transactions/status.ts).
 *
 * IMPORTANT: this mirror powers UI *feedback* only. It is not authorization. The
 * API rejects a disallowed transition with 409 INVALID_TRANSITION regardless of
 * what the UI shows, and the UI must surface that rejection, not swallow it.
 */
export const PERMITTED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

/** Statuses that cannot be left once entered. */
export const TERMINAL_STATUSES: TransactionStatus[] = ["COMPLETED", "FAILED"];

export function permittedTransitions(from: TransactionStatus): TransactionStatus[] {
  return PERMITTED_TRANSITIONS[from];
}

export function isEditable(status: TransactionStatus): boolean {
  return status === "PENDING";
}

/** A move is "consequential" when it lands on a terminal status (irreversible). */
export function isConsequential(to: TransactionStatus): boolean {
  return TERMINAL_STATUSES.includes(to);
}
