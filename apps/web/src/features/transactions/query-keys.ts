/**
 * Query keys for transactions. Centralized so every hook that reads or
 * invalidates the same data composes the same key. `list` keys include the
 * serialized query string, so each filter combination caches separately.
 */
export const transactionKeys = {
  all: ["transactions"] as const,
  list: (query: string) => ["transactions", "list", query] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
};
