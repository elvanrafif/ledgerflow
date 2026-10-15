export const PERMITTED_TRANSITIONS = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
} as const;

export type TransactionStatus = keyof typeof PERMITTED_TRANSITIONS;

export function isPermittedTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return (PERMITTED_TRANSITIONS[from] as readonly string[]).includes(to);
}

export function isEditable(status: TransactionStatus): boolean {
  return status === "PENDING";
}
