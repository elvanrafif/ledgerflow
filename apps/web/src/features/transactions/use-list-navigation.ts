"use client";

import { useRouter } from "next/navigation";
import { buildQuery, type ListFilters } from "@/lib/list-filters";

/**
 * Owns URL state for the transaction list. Filter/search/sort/page all live in
 * the URL, so the view is shareable and survives a reload; changing any filter
 * returns the reader to the first page.
 */
export function useListNavigation(filters: ListFilters) {
  const router = useRouter();

  function navigate(overrides: Partial<ListFilters>) {
    const next = buildQuery({ ...filters, ...overrides }, { resetPage: true });
    router.push(`/transactions${next ? `?${next}` : ""}`);
  }

  return { navigate };
}
