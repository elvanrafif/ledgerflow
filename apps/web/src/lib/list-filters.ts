/** URL-driven list filters, shared by the list page and its controls. */
export interface ListFilters {
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
}

/** True when any filter beyond the default view is active. */
export function hasActiveFilters(filters: ListFilters): boolean {
  return Boolean(filters.status || filters.search);
}

/**
 * Serialize filters into a query string. Empty/undefined values are dropped so
 * the URL stays clean and shareable. Optionally drops `page` so changing a
 * filter returns the reader to the first page.
 */
export function buildQuery(
  filters: ListFilters,
  options: { resetPage?: boolean } = {},
): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (!options.resetPage && filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}
