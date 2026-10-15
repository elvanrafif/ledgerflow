import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors.js";

/**
 * Shorthand in-memory rate limit, keyed by client IP.
 *
 * Process-local limits do not coordinate across API instances; use a shared
 * store (Redis, etc.) when scaling beyond one instance.
 */
export function rateLimit(limit = 10, windowMs = 15 * 60 * 1000) {
  const attempts = new Map<string, { count: number; expiresAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expiresAt <= now) attempts.delete(key);
    const key = req.ip ?? "unknown";
    const current = attempts.get(key);
    if (current && current.count >= limit) {
      next(new AppError(429, "AUTH_RATE_LIMITED", "Too many authentication attempts; try again later"));
      return;
    }
    attempts.set(key, current ? { ...current, count: current.count + 1 } : { count: 1, expiresAt: now + windowMs });
    next();
  };
}
