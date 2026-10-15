/** Shapes returned by the LedgerFlow API (apps/api). Money is always a string. */

export type TransactionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type Currency = "IDR" | "USD" | "SGD";

export interface Transaction {
  id: string;
  reference: string;
  description: string;
  /** DECIMAL(18,2) serialized as a string, e.g. "1500000.00". Never a number. */
  amount: string;
  currency: Currency;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionHistoryEntry {
  previousStatus: TransactionStatus | null;
  status: TransactionStatus;
  note: string | null;
  changedById: string;
  createdAt: string;
}

/** GET /transactions — paginated, owner-scoped list (flat pagination fields). */
export interface TransactionListResponse {
  transactions: Transaction[];
  page: number;
  pageSize: number;
  total: number;
}

/** GET /transactions/:id — the transaction with its status history nested. */
export interface TransactionDetail extends Transaction {
  history: TransactionHistoryEntry[];
}

export interface TransactionDetailResponse {
  transaction: TransactionDetail;
}

/** GET /dashboard/summary */
export interface DashboardSummary {
  total: number;
  byStatus: Record<TransactionStatus, number>;
  totalsByCurrency: { currency: Currency; total: string }[];
}

/** Query parameters accepted by GET /transactions. */
export interface TransactionQuery {
  page?: number;
  pageSize?: number;
  status?: TransactionStatus;
  search?: string;
  sort?: string;
}
