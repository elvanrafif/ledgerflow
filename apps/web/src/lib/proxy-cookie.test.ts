import { describe, expect, it } from "vitest";
import { rewriteCookieDomain } from "./proxy-cookie";

describe("rewriteCookieDomain", () => {
  it("drops a Domain attribute so the cookie scopes to the web origin", () => {
    const input =
      "ledgerflow.sid=abc123; Domain=api-ledgerflow.elvanrff.id; Path=/; HttpOnly; Secure; SameSite=None";
    const output = rewriteCookieDomain(input);
    expect(output).not.toMatch(/domain=/i);
    expect(output).toContain("ledgerflow.sid=abc123");
    expect(output).toContain("Path=/");
    expect(output).toContain("HttpOnly");
    expect(output).toContain("Secure");
    expect(output).toContain("SameSite=None");
  });

  it("leaves a cookie without a Domain attribute untouched", () => {
    const input = "ledgerflow.sid=abc123; Path=/; HttpOnly";
    expect(rewriteCookieDomain(input)).toBe(input);
  });
});
