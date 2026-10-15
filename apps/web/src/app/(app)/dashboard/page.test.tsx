import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DashboardSummary } from "@/lib/types";

const serverFetch = vi.fn();
vi.mock("@/lib/server-fetch", () => ({
  serverFetch: (path: string) => serverFetch(path),
}));

// AppShell (in the (app) layout) uses client navigation hooks; not rendered here
// but imported transitively by some children.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard",
}));

import DashboardPage from "./page";

const summary: DashboardSummary = {
  total: 3,
  byStatus: { PENDING: 1, PROCESSING: 0, COMPLETED: 1, FAILED: 1 },
  totalsByCurrency: [
    { currency: "IDR", total: "1500000.00" },
    { currency: "USD", total: "25.50" },
  ],
};

beforeEach(() => {
  serverFetch.mockReset();
  serverFetch.mockResolvedValue(summary);
});

describe("DashboardPage", () => {
  it("lists each currency total separately and never sums them", async () => {
    render(await DashboardPage());
    expect(screen.getByText(/IDR/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    // 1,500,000.00 (IDR) + 25.50 (USD) must never be shown as one figure.
    expect(screen.queryByText(/1\.500\.025/)).not.toBeInTheDocument();
  });

  it("renders each currency total with its own formatted amount", async () => {
    render(await DashboardPage());
    expect(screen.getByText(/1\.500\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/\$25\.50/)).toBeInTheDocument();
  });

  it("shows counts by status as secondary information", async () => {
    render(await DashboardPage());
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it("shows an empty state naming the action that fills it when there is nothing", async () => {
    serverFetch.mockResolvedValue({
      total: 0,
      byStatus: { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 },
      totalsByCurrency: [],
    } satisfies DashboardSummary);

    render(await DashboardPage());
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new transaction/i })).toHaveAttribute(
      "href",
      "/transactions/new",
    );
  });

  it("surfaces a load failure instead of rendering broken totals", async () => {
    serverFetch.mockRejectedValue(new Error("network down"));
    render(await DashboardPage());
    expect(screen.getByRole("alert")).toHaveTextContent(/could not load/i);
  });
});
