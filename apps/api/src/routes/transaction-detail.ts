import { Router } from "express";
import { z } from "zod";
import { type AuthContext, currentUser, protectState, requireAuth } from "../auth/guards.js";
import { rateLimit } from "../auth/rate-limit.js";
import { AppError } from "../errors.js";
import { parseBody } from "../http/validation.js";
import { TransactionRepository } from "../transactions/repository.js";
import { TransactionService } from "../transactions/service.js";
import { toView } from "../transactions/view.js";

const update = z.object({ description: z.string().trim().min(1).max(500) }).strict();

const statusChange = z.object({
  status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]),
  note: z.string().trim().max(500).optional(),
});

const params = z.object({ id: z.string().uuid() });

function transactionId(value: unknown): string {
  const parsed = params.safeParse(value);
  if (!parsed.success) throw new AppError(404, "NOT_FOUND", "Transaction not found");
  return parsed.data.id;
}

export function transactionDetailRouter(context: AuthContext) {
  const router = Router();
  const service = new TransactionService(new TransactionRepository(context.prisma));
  const authenticate = requireAuth(context);
  const writeLimit = rateLimit(60, 60 * 1000);

  router.get("/:id", authenticate, async (req, res, next) => {
    try {
      const transaction = await service.detail(currentUser(res).id, transactionId(req.params));
      res.json({ transaction });
    } catch (error) { next(error); }
  });

  router.patch("/:id", writeLimit, authenticate, async (req, res, next) => {
    try {
      protectState(req, context);
      const input = parseBody(update, req.body);
      const updated = await service.updateDescription(currentUser(res).id, transactionId(req.params), input.description);
      res.json({ transaction: toView(updated) });
    } catch (error) { next(error); }
  });

  router.post("/:id/status", writeLimit, authenticate, async (req, res, next) => {
    try {
      protectState(req, context);
      const input = parseBody(statusChange, req.body);
      const updated = await service.changeStatus(
        currentUser(res).id,
        transactionId(req.params),
        input.status,
        input.note,
      );
      res.json({ transaction: toView(updated) });
    } catch (error) { next(error); }
  });

  return router;
}
