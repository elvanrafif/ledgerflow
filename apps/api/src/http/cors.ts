import type { Request, Response } from "express";
import { AppError } from "../errors.js";

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
