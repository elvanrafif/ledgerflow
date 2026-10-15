import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "./errors.js";

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Query validation failed", parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}

// shorthand: a single browser app is served same-origin, so requiring Origin to
// equal FRONTEND_ORIGIN is sufficient CSRF protection. Split-origin deploys with
// multiple allowed origins need a token-based scheme instead.
export function requireFrontendOrigin(req: Request, expected: string) {
  if (req.get("Origin") !== expected) {
    throw new AppError(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed");
  }
}

export function setCorsHeaders(res: Response, req: Request, frontendOrigin: string) {
  res.vary("Origin");
  if (req.get("Origin") === frontendOrigin) {
    res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  }
}
