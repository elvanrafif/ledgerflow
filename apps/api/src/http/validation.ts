import { z } from "zod";
import { AppError } from "../errors.js";

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
