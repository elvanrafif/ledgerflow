"use client";

import { Button } from "@/components/Button";
import { hasActiveFilters, type ListFilters } from "@/lib/list-filters";

/**
 * Search / status / sort controls. Each control pushes a new URL (via onNavigate)
 * rather than holding local state, so the URL stays the single source of truth.
 */
export function TransactionFilterBar({
  filters,
  onNavigate,
}: {
  filters: ListFilters;
  onNavigate: (overrides: Partial<ListFilters>) => void;
}) {
  return (
    <div
      role="search"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-3)",
        alignItems: "flex-end",
        background: "var(--surface-default)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
      }}
    >
      <label style={controlLabel}>
        <span style={controlLabelText}>Search</span>
        <input
          className="field__input"
          type="search"
          name="search"
          defaultValue={filters.search ?? ""}
          placeholder="Reference or description"
          onKeyDown={(event) => {
            if (event.key === "Enter") onNavigate({ search: (event.target as HTMLInputElement).value });
          }}
        />
      </label>

      <label style={controlLabel}>
        <span style={controlLabelText}>Status</span>
        <select
          className="field__input"
          name="status"
          value={filters.status ?? ""}
          onChange={(event) => onNavigate({ status: event.target.value || undefined })}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </label>

      <label style={controlLabel}>
        <span style={controlLabelText}>Sort</span>
        <select
          className="field__input"
          name="sort"
          value={filters.sort ?? "createdAt:desc"}
          onChange={(event) => onNavigate({ sort: event.target.value })}
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
        </select>
      </label>

      {hasActiveFilters(filters) ? (
        <Button variant="ghost" onClick={() => onNavigate({ status: undefined, search: undefined })}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

const controlLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const controlLabelText: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" };
