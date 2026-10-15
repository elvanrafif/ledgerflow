import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders as render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import type { TransactionDetail as TransactionDetailData } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
  usePathname: () => "/transactions/11111111-1111-1111-1111-111111111111",
}));

import { TransactionDetail } from "./transaction-detail";

function detail(overrides: Partial<TransactionDetailData> = {}): TransactionDetailData {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    reference: "TRX-0001",
    description: "Invoice payment",
    amount: "1500000.00",
    currency: "IDR",
    status: "PENDING",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    history: [
      { previousStatus: null, status: "PENDING", note: null, changedById: "u1", createdAt: "2026-10-01T10:00:00.000Z" },
    ],
    ...overrides,
  };
}

beforeEach(() => push.mockReset());

describe("TransactionDetail — transitions", () => {
  it("offers only permitted transitions and confirms before a terminal move", async () => {
    render(<TransactionDetail transaction={detail({ status: "PENDING" })} />);

    expect(screen.getByRole("button", { name: /processing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /failed/i })).toBeInTheDocument();
    // COMPLETED is not reachable from PENDING.
    expect(screen.queryByRole("button", { name: /completed/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /failed/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/cannot be undone/i);
  });

  it("Escape closes the confirmation dialog without transitioning", async () => {
    const posted = vi.fn();
    server.use(http.post("*/api/v1/transactions/:id/status", () => {
      posted();
      return HttpResponse.json({ transaction: {} });
    }));

    render(<TransactionDetail transaction={detail({ status: "PENDING" })} />);
    await userEvent.click(screen.getByRole("button", { name: /failed/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(posted).not.toHaveBeenCalled();
  });

  it("shows no transition controls for a terminal transaction", () => {
    render(<TransactionDetail transaction={detail({ status: "COMPLETED" })} />);
    expect(screen.queryAllByRole("button", { name: /processing|failed|completed/i })).toHaveLength(0);
    expect(screen.getByText(/no further changes/i)).toBeInTheDocument();
  });

  it("surfaces a 409 from the API instead of swallowing it", async () => {
    server.use(
      http.post("*/api/v1/transactions/:id/status", () =>
        HttpResponse.json(
          { error: { code: "INVALID_TRANSITION", message: "Cannot move a COMPLETED transaction to FAILED" } },
          { status: 409 },
        ),
      ),
    );

    render(<TransactionDetail transaction={detail({ status: "PENDING" })} />);
    // FAILED is terminal, so it asks for confirmation first.
    await userEvent.click(screen.getByRole("button", { name: /failed/i }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^failed$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot move/i);
  });
});

describe("TransactionDetail — history", () => {
  it("shows a timeline with previous status, new status and when", () => {
    render(
      <TransactionDetail
        transaction={detail({
          status: "PROCESSING",
          history: [
            { previousStatus: null, status: "PENDING", note: null, changedById: "u1", createdAt: "2026-10-01T10:00:00.000Z" },
            { previousStatus: "PENDING", status: "PROCESSING", note: "started", changedById: "u1", createdAt: "2026-10-02T09:30:00.000Z" },
          ],
        })}
      />,
    );

    expect(screen.getByText("started")).toBeInTheDocument();
    expect(screen.getAllByRole("time").length).toBeGreaterThanOrEqual(2);
  });
});

describe("TransactionDetail — editing", () => {
  it("allows editing the description while PENDING", async () => {
    let patched: unknown;
    server.use(
      http.patch("*/api/v1/transactions/:id", async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ transaction: detail({ description: "Revised" }) });
      }),
    );

    render(<TransactionDetail transaction={detail({ status: "PENDING" })} />);
    await userEvent.click(screen.getByRole("button", { name: /edit description/i }));
    const input = await screen.findByRole("textbox", { name: /^description$/i });
    await userEvent.clear(input);
    await userEvent.type(input, "Revised");
    await userEvent.click(screen.getByRole("button", { name: /save description/i }));

    await vi.waitFor(() => expect(patched).toEqual({ description: "Revised" }));
  });

  it("does not offer editing once the transaction is not PENDING", () => {
    render(<TransactionDetail transaction={detail({ status: "PROCESSING" })} />);
    expect(screen.queryByRole("button", { name: /save description/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only pending transactions can be edited/i)).toBeInTheDocument();
  });
});
