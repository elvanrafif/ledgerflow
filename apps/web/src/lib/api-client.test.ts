import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "./api-client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes browser calls through the same-origin proxy and surfaces the API error shape", async () => {
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
    // The session cookie must live on the web origin, so browser calls never
    // target the API's own domain directly.
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/auth/me",
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

  it("uses the configured API base URL for absolute (non-browser) callers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const originalWindow = globalThis.window;
    // Simulate a non-browser environment (no window) to hit the server branch.
    // @ts-expect-error -- deliberately removing window for this assertion.
    delete globalThis.window;
    try {
      await apiFetch("/auth/me");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/me"),
        expect.anything(),
      );
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).not.toBe("/api/proxy/auth/me");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
