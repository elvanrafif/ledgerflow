import express from "express";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/error-handler.js";

describe("API error responses", () => {
  it("returns a stable 404 response for unknown routes", async () => {
    const response = await request(createApp(async () => {})).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
  });

  it("hides unexpected error details in production", async () => {
    const app = express();
    app.get("/failure", () => {
      throw new Error("database password leaked");
    });
    app.use(errorHandler("production"));

    const response = await request(app).get("/failure");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
    expect(JSON.stringify(response.body)).not.toContain("database password");
  });
});
