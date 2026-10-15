import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import type { Transaction } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
  usePathname: () => "/transactions/new",
}));

import NewTransactionPage from "./page";

/** Collect the Idempotency-Key header from every POST /transactions. */
function captureKeys(): string[] {
  const keys: string[] = [];
  server.use(
    http.post("*/api/proxy/transactions", async ({ request }) => {
      keys.push(request.headers.get("Idempotency-Key") ?? "");
      if (keys.length === 1) {
        // First attempt: fail at the network layer (no response).
        return HttpResponse.error();
      }
      const created: Transaction = {
        id: "11111111-1111-1111-1111-111111111111",
        reference: "TRX-0001",
        description: "Invoice payment",
        amount: "1500000.00",
        currency: "IDR",
        status: "PENDING",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      };
      return HttpResponse.json({ transaction: created }, { status: 201 });
    }),
  );
  return keys;
}

async function fillValidForm() {
  await userEvent.clear(screen.getByLabelText(/description/i));
  await userEvent.type(screen.getByLabelText(/description/i), "Invoice payment");
  await userEvent.type(screen.getByLabelText(/amount/i), "1500000.00");
  await userEvent.selectOptions(screen.getByLabelText(/currency/i), "IDR");
}

beforeEach(() => push.mockReset());

describe("NewTransactionPage", () => {
  it("reuses the same idempotency key when a submit is retried", async () => {
    const keys = captureKeys();
    render(<NewTransactionPage />);
    await fillValidForm();

    await userEvent.click(screen.getByRole("button", { name: /create transaction/i })); // network error
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: /create transaction/i })); // retry

    await vi.waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
  });

  it("generates a new key when the payload changes", async () => {
    const keys = captureKeys();
    render(<NewTransactionPage />);
    await fillValidForm();

    await userEvent.click(screen.getByRole("button", { name: /create transaction/i })); // error
    await screen.findByRole("alert");

    // Change the payload, then submit again.
    await userEvent.type(screen.getByLabelText(/description/i), " (revised)");
    await userEvent.click(screen.getByRole("button", { name: /create transaction/i }));

    await vi.waitFor(() => expect(keys.length).toBeGreaterThanOrEqual(2));
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("sends the amount as a string and redirects on success", async () => {
    let sentBody: unknown;
    server.use(
      http.post("*/api/proxy/transactions", async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ transaction: { id: "x" } }, { status: 201 });
      }),
    );

    render(<NewTransactionPage />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /create transaction/i }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/transactions")));
    expect(sentBody).toMatchObject({ amount: "1500000.00", currency: "IDR" });
  });

  it("blocks an obviously invalid amount before hitting the API", async () => {
    let posted = false;
    server.use(
      http.post("*/api/proxy/transactions", () => {
        posted = true;
        return HttpResponse.json({ transaction: {} }, { status: 201 });
      }),
    );

    render(<NewTransactionPage />);
    await userEvent.type(screen.getByLabelText(/description/i), "Invoice payment");
    await userEvent.type(screen.getByLabelText(/amount/i), "0");
    await userEvent.click(screen.getByRole("button", { name: /create transaction/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/greater than zero/i);
    expect(posted).toBe(false);
  });
});
