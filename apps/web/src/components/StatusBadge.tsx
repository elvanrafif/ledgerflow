/**
 * Status badge. Status is the primary carrier of meaning in the ledger, so the
 * badge shows the status as *text* (readable without color) and pairs it with a
 * color and border for fast scanning. The four statuses are fixed by the API's
 * state machine: PENDING, PROCESSING, COMPLETED, FAILED.
 */
import type { TransactionStatus } from "@/lib/types";

export type { TransactionStatus };

export const STATUSES: readonly TransactionStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export interface StatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={["status-badge", className].filter(Boolean).join(" ")}
      data-status={status}
    >
      {status.toLowerCase()}
    </span>
  );
}
