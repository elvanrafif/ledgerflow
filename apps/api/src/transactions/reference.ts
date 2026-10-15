export type TransactionView = {
  id: string;
  reference: string;
  description: string;
  amount: string;
  currency: "IDR" | "USD" | "SGD";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  updatedAt: string;
};

export function generateReference(): string {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
