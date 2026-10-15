import { Router } from "express";
import { type AuthContext, currentUser, requireAuth } from "../auth/guards.js";
import { TransactionRepository } from "../transactions/repository.js";
import { TransactionService } from "../transactions/service.js";

export function dashboardRouter(context: AuthContext) {
  const router = Router();
  const service = new TransactionService(new TransactionRepository(context.prisma));
  const authenticate = requireAuth(context);

  router.get("/summary", authenticate, async (_req, res, next) => {
    try {
      res.json(await service.summary(currentUser(res).id));
    } catch (error) { next(error); }
  });

  return router;
}
