import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "./api-client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends credentials and surfaces the API error shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/auth/me")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/me"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("attaches the idempotency key only when given one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/transactions", { method: "POST", idempotencyKey: "key-1", body: "{}" });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("key-1");
  });
});
