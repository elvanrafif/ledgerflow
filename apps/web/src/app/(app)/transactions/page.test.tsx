import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders as render, screen } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import type { Transaction, TransactionListResponse } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
  usePathname: () => "/transactions",
}));

import { TransactionList } from "./transaction-list";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    reference: "TRX-0001",
    description: "Invoice payment",
    amount: "1500000.00",
    currency: "IDR",
    status: "PENDING",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

function pageData(items: Transaction[], total = items.length): TransactionListResponse {
  return { transactions: items, page: 1, pageSize: 20, total };
}

/** Respond to GET /transactions with the given body. */
function mockList(body: TransactionListResponse) {
  server.use(http.get("*/api/v1/transactions", () => HttpResponse.json(body)));
}

beforeEach(() => push.mockReset());

describe("TransactionList", () => {
  it("keeps filters in the URL so the view is shareable and reloadable", async () => {
    mockList(pageData([tx()]));

    render(<TransactionList searchParams={{ status: "FAILED", page: "2" }} />);

    expect(await screen.findByRole("combobox", { name: /status/i })).toHaveValue("FAILED");
  });

  it("renders the columns the reader decides on", async () => {
    mockList(
      pageData([tx({ status: "COMPLETED", currency: "IDR", amount: "1500000.00", description: "Invoice payment" })]),
    );

    render(<TransactionList searchParams={{}} />);

    expect(await screen.findByText("TRX-0001")).toBeInTheDocument();
    expect(screen.getByText("Invoice payment")).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000,00/)).toBeInTheDocument();
    // Scope to the badge: the status filter also has a "Completed" option.
    expect(screen.getByText("completed", { selector: ".status-badge" })).toHaveAttribute(
      "data-status",
      "COMPLETED",
    );
  });

  it("distinguishes 'no transactions yet' from 'no matches for these filters'", async () => {
    // No rows at all: nothing exists yet.
    mockList(pageData([], 0));
    const { unmount } = render(<TransactionList searchParams={{}} />);
    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();
    unmount();

    // Rows exist, but this filter matches none.
    mockList(pageData([], 0));
    render(<TransactionList searchParams={{ status: "FAILED" }} />);
    expect(await screen.findByText(/no transactions match/i)).toBeInTheDocument();
  });

  it("pushes a new URL when the status filter changes", async () => {
    mockList(pageData([tx()]));

    render(<TransactionList searchParams={{}} />);
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: /status/i }), "FAILED");

    expect(push).toHaveBeenCalledWith(expect.stringContaining("status=FAILED"));
  });

  it("links to each transaction's detail page", async () => {
    mockList(pageData([tx()]));

    render(<TransactionList searchParams={{}} />);
    const link = await screen.findByRole("link", { name: /TRX-0001/ });
    expect(link).toHaveAttribute("href", "/transactions/11111111-1111-1111-1111-111111111111");
  });

  it("surfaces a load failure instead of an empty table", async () => {
    server.use(
      http.get("*/api/v1/transactions", () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "boom" } }, { status: 500 }),
      ),
    );

    render(<TransactionList searchParams={{}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
  });
});
