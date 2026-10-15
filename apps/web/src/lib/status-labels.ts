import type { TransactionStatus } from "@/lib/types";

/** Human labels for statuses, used wherever a status appears as words. */
export const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};
