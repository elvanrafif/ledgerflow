"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Owns the app's single QueryClient. Created lazily in state so a client is not
 * shared across requests during SSR. Defaults are conservative:
 * - retry: false — a failing request surfaces immediately (the UI shows API
 *   errors directly; no silent retries).
 * - refetchOnWindowFocus: false — no surprise refetch while a demo is on screen.
 * - staleTime: 5s — a short window so navigating back is instant without serving
 *   data that is obviously stale.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5000 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
