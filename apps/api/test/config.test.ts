import { describe, expect, it } from "vitest";
import { readConfig } from "../src/config.js";

describe("readConfig", () => {
  it("rejects a missing database URL", () => {
    expect(() => readConfig({})).toThrow();
  });

  it("uses the supplied API port", () => {
    expect(readConfig({
      DATABASE_URL: "postgresql://localhost/db",
      SESSION_SECRET: "test-session-secret-with-adequate-length",
      PORT: "4310",
    }).port).toBe(4310);
  });
});
