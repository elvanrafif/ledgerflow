import { Prisma } from "@prisma/client";
import { type AuthContext, currentUser, protectState, requireAuth } from "../auth/guards.js";
import { rateLimit } from "../auth/rate-limit.js";
import { AppError } from "../errors.js";
import { parseBody } from "../http/validation.js";
import { isEditable, isPermittedTransition, type TransactionStatus } from "../transactions/status.js";
import { type TransactionHistoryRow, toHistoryView, toView } from "../transactions/view.js";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const update = z
  .object({ description: z.string().trim().min(1).max(500) })
  .strict();

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

async function loadOwned(prisma: PrismaClient, userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw new AppError(404, "NOT_FOUND", "Transaction not found");
  return transaction;
}

export function transactionDetailRouter(context: AuthContext) {
  const router = Router();
  const prisma: PrismaClient = context.prisma;
  const authenticate = requireAuth(context);
  const writeLimit = rateLimit(60, 60 * 1000);

  router.get("/:id", authenticate, async (req, res, next) => {
    try {
      const transaction = await loadOwned(prisma, currentUser(res).id, transactionId(req.params));
      const history = await prisma.transactionStatusHistory.findMany({
        where: { transactionId: transaction.id },
        orderBy: { createdAt: "asc" },
      });
      res.json({ transaction: { ...toView(transaction), history: history.map(toHistoryView) } });
    } catch (error) { next(error); }
  });

  router.patch("/:id", writeLimit, authenticate, async (req, res, next) => {
    try {
      protectState(req, context);
      const input = parseBody(update, req.body);
      const transaction = await loadOwned(prisma, currentUser(res).id, transactionId(req.params));
      if (!isEditable(transaction.status)) {
        throw new AppError(409, "INVALID_STATUS_FOR_EDIT", "Only pending transactions can be edited");
      }
      const updated = await prisma.transaction.update({
        where: { id: transaction.id },
        data: { description: input.description },
      });
      res.json({ transaction: toView(updated) });
    } catch (error) { next(error); }
  });

  router.post("/:id/status", writeLimit, authenticate, async (req, res, next) => {
    try {
      protectState(req, context);
      const input = parseBody(statusChange, req.body);
      const userId = currentUser(res).id;
      const id = transactionId(req.params);
      // Serialize transitions on this row so concurrent requests re-read the
      // committed status instead of both acting on a stale PENDING snapshot.
      const result = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ status: TransactionStatus }[]>`
          SELECT "status" FROM "Transaction"
          WHERE "id" = ${id}::uuid AND "userId" = ${userId}::uuid
          FOR UPDATE
        `;
        if (locked.length === 0) throw new AppError(404, "NOT_FOUND", "Transaction not found");

        const from = locked[0].status;
        if (!isPermittedTransition(from, input.status)) {
          throw new AppError(409, "INVALID_TRANSITION", `Cannot move a ${from} transaction to ${input.status}`);
        }
        const updated = await tx.transaction.update({ where: { id }, data: { status: input.status } });
        await tx.transactionStatusHistory.create({
          data: {
            transactionId: id,
            previousStatus: from,
            status: input.status,
            changedById: userId,
            note: input.note,
          },
        });
        return updated;
      });
      res.json({ transaction: toView(result) });
    } catch (error) { next(error); }
  });

  return router;
}

export type { TransactionHistoryRow };
