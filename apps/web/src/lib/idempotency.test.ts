import { describe, expect, it } from "vitest";
import { keyForPayload, payloadSignature } from "./idempotency";

const base = { description: "Invoice payment", amount: "1500000.00", currency: "IDR" };

describe("keyForPayload", () => {
  it("reuses the key when the payload is unchanged (retry-safe)", () => {
    const first = keyForPayload(null, base);
    const retry = keyForPayload(first, { ...base });
    expect(retry.key).toBe(first.key);
  });

  it("issues a new key when the payload changes", () => {
    const first = keyForPayload(null, base);
    expect(keyForPayload(first, { ...base, amount: "2000000.00" }).key).not.toBe(first.key);
    expect(keyForPayload(first, { ...base, description: "Other" }).key).not.toBe(first.key);
    expect(keyForPayload(first, { ...base, currency: "USD" }).key).not.toBe(first.key);
  });

  it("produces distinct keys across independent payloads", () => {
    const a = keyForPayload(null, base);
    const b = keyForPayload(null, base);
    expect(a.key).not.toBe(b.key);
  });
});

describe("payloadSignature", () => {
  it("is stable for equal payloads and distinct otherwise", () => {
    expect(payloadSignature(base)).toBe(payloadSignature({ ...base }));
    expect(payloadSignature(base)).not.toBe(payloadSignature({ ...base, amount: "1.00" }));
  });
});
