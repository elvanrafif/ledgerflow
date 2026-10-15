import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors.js";
export function errorHandler(nodeEnv = process.env.NODE_ENV): ErrorRequestHandler {
  return (error, _req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof AppError) {
      res.status(error.status).json({ error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      } });
      return;
    }

    console.error(JSON.stringify({ level: "error", code: "INTERNAL_ERROR" }));
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: nodeEnv === "production" ? "An unexpected error occurred" : error.message,
      },
    });
  };
}
