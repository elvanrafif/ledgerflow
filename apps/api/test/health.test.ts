import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /api/v1/health", () => {
  it("returns ok when the database check succeeds", async () => {
    const app = createApp(async () => {});

    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns unavailable when the database check fails", async () => {
    const app = createApp(async () => {
      throw new Error("database is unavailable");
    });

    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
  });
});
