import { Button } from "@/components/Button";
import type { TransactionListResponse } from "@/lib/types";

/** Page controls with bounds disabled, plus the "page N of M · total" summary. */
export function TransactionPagination({
  data,
  onPage,
}: {
  data: TransactionListResponse;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
        Page {data.page} of {totalPages} · {data.total} total
      </span>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button variant="secondary" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={data.page >= totalPages} onClick={() => onPage(data.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
