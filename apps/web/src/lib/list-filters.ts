/** URL-driven list filters, shared by the list page and its controls. */
export interface ListFilters {
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
}

/**
 * Read filters from Next's `searchParams`. Repeated keys collapse to the first
 * value; a non-positive or non-numeric page is treated as absent.
 */
export function readFilters(searchParams: Record<string, string | string[] | undefined>): ListFilters {
  const one = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));
  return {
    status: one("status"),
    search: one("search"),
    sort: one("sort"),
    page: Number.isFinite(page) && page > 0 ? page : undefined,
  };
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
