import { Router } from "express";
import { z } from "zod";
import { type AuthContext, currentUser, protectState, requireAuth } from "../auth/guards.js";
import { rateLimit } from "../auth/rate-limit.js";
import { AppError } from "../errors.js";
import { parseBody, parseQuery } from "../http/validation.js";
import { TransactionRepository } from "../transactions/repository.js";
import { TransactionService } from "../transactions/service.js";
import { toView } from "../transactions/view.js";

const currencies = ["IDR", "USD", "SGD"] as const;
const statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;

const creation = z.object({
  description: z.string().trim().min(1).max(500),
  amount: z.union([z.string(), z.number()]),
  currency: z.enum(currencies),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(statuses).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["createdAt:asc", "createdAt:desc"]).default("createdAt:desc"),
});

export function transactionsRouter(context: AuthContext) {
  const router = Router();
  const service = new TransactionService(new TransactionRepository(context.prisma));
  const authenticate = requireAuth(context);
  const writeLimit = rateLimit(60, 60 * 1000);

  router.post("/", writeLimit, authenticate, async (req, res, next) => {
    try {
      protectState(req, context);
      const idempotencyKey = req.get("Idempotency-Key");
      if (!idempotencyKey) {
        throw new AppError(400, "VALIDATION_ERROR", "Idempotency-Key header is required", { "Idempotency-Key": ["Required"] });
      }
      const input = parseBody(creation, req.body);
      const { transaction, created } = await service.create({
        userId: currentUser(res).id,
        idempotencyKey,
        ...input,
      });
      res.status(created ? 201 : 200).json({ transaction: toView(transaction) });
    } catch (error) { next(error); }
  });

  router.get("/", authenticate, async (req, res, next) => {
    try {
      const query = parseQuery(listQuery, req.query);
      res.json(await service.list({ userId: currentUser(res).id, ...query }));
    } catch (error) { next(error); }
  });

  return router;
}
