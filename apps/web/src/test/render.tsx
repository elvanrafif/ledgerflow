import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

/**
 * Render a component inside a fresh QueryClient, so tests do not share cache
 * between cases. `retry: false` matches the app default: a failing request
 * surfaces on the first attempt. Pass a `client` to inspect the cache (e.g. to
 * assert invalidation).
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { client?: QueryClient },
) {
  const { client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), ...rest } =
    options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}

export * from "@testing-library/react";
