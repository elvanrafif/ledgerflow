import type { Prisma } from "@prisma/client";

export const transactionShape = {
  id: true, reference: true, description: true, amount: true,
  currency: true, status: true, createdAt: true, updatedAt: true,
} as const;

export type TransactionRow = {
  id: string; reference: string; description: string; amount: Prisma.Decimal;
  currency: string; status: string; createdAt: Date; updatedAt: Date;
};

export type TransactionHistoryRow = {
  previousStatus: string | null; status: string; note: string | null;
  changedById: string; createdAt: Date;
};

export function toView(row: TransactionRow) {
  return {
    id: row.id,
    reference: row.reference,
    description: row.description,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toHistoryView(row: TransactionHistoryRow) {
  return {
    previousStatus: row.previousStatus,
    status: row.status,
    note: row.note,
    changedById: row.changedById,
    createdAt: row.createdAt.toISOString(),
  };
}
