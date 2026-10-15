import { Router } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { type AuthContext, currentUser, requireAuth } from "../auth/guards.js";

const statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;

export function dashboardRouter(context: AuthContext) {
  const router = Router();
  const prisma: PrismaClient = context.prisma;
  const authenticate = requireAuth(context);

  router.get("/summary", authenticate, async (_req, res, next) => {
    try {
      const userId = currentUser(res).id;
      const [total, grouped, byCurrency] = await Promise.all([
        prisma.transaction.count({ where: { userId } }),
        prisma.transaction.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
        prisma.transaction.groupBy({
          by: ["currency"],
          where: { userId },
          _sum: { amount: true },
          orderBy: { currency: "asc" },
        }),
      ]);

      const byStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<string, number>;
      for (const row of grouped) byStatus[row.status] = row._count._all;

      res.json({
        total,
        byStatus,
        totalsByCurrency: byCurrency.map((row) => ({
          currency: row.currency,
          total: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        })),
      });
    } catch (error) { next(error); }
  });

  return router;
}
