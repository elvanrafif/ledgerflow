import express from "express";
import { AppError } from "./errors.js";
import { setCorsHeaders } from "./http/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter, type AuthOptions } from "./routes/auth.js";
import { requireOrigin } from "./auth/guards.js";
import { transactionsRouter } from "./routes/transactions.js";
import { transactionDetailRouter } from "./routes/transaction-detail.js";
import { dashboardRouter } from "./routes/dashboard.js";

export function createApp(checkDatabase: () => Promise<void>, auth?: AuthOptions) {
  const app = express();
  if (auth) {
    const stateGuard = requireOrigin(auth);
    app.use((req, res, next) => {
      setCorsHeaders(res, req, auth.frontendOrigin);
      if (req.method === "OPTIONS") return res.sendStatus(204);
      if (req.method === "GET" || req.method === "HEAD") return next();
      stateGuard(req, res, next);
      return;
    });
  }
  app.use(express.json());
  app.use("/api/v1", healthRouter(checkDatabase));
  if (auth) app.use("/api/v1/auth", authRouter(auth));
  if (auth) app.use("/api/v1/transactions", transactionsRouter(auth));
  if (auth) app.use("/api/v1/transactions", transactionDetailRouter(auth));
  if (auth) app.use("/api/v1/dashboard", dashboardRouter(auth));
  app.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Resource not found")));
  app.use(errorHandler());
  return app;
}
