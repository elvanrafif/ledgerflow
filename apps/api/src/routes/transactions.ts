import { Router } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { type AuthContext, currentUser, protectState, rateLimit, requireAuth } from "../auth.js";
import { AppError } from "../errors.js";
import { parseBody, parseQuery } from "../http.js";
import { generateReference } from "../transactions/reference.js";
import { toHistoryView, toView, type TransactionRow } from "../transactions/view.js";

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

function toAmount(value: string | number): Prisma.Decimal {
  const message = "Amount must be a positive number with at most two decimal places";
  // Prisma.Decimal throws on non-numeric input (e.g. "abc"). We must catch that
  // here so a malformed amount becomes the intended 400 VALIDATION_ERROR rather
  // than escaping as a 500 with a raw Decimal library message.
  let amount: Prisma.Decimal;
  try {
    amount = new Prisma.Decimal(value);
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", message, { amount: [message] });
  }
  if (!amount.isFinite() || amount.lte(0) || !amount.equals(amount.toDecimalPlaces(2))) {
    throw new AppError(400, "VALIDATION_ERROR", message, { amount: [message] });
  }
  return amount;
}

function hashPayload(description: string, amount: Prisma.Decimal, currency: string) {
  return `${description}\u0000${amount.toFixed(2)}\u0000${currency}`;
}

export function transactionsRouter(context: AuthContext) {
  const router = Router();
  const prisma: PrismaClient = context.prisma;
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
      const amount = toAmount(input.amount);
      const signature = hashPayload(input.description, amount, input.currency);
      const userId = currentUser(res).id;
      const where = { userId_idempotencyKey: { userId, idempotencyKey } };

      const existing = await prisma.transaction.findUnique({ where });
      if (existing) {
        if (hashPayload(existing.description, existing.amount, existing.currency) !== signature) {
          throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was already used with a different payload");
        }
        res.status(200).json({ transaction: toView(existing) });
        return;
      }

      try {
        const created = await prisma.transaction.create({
          data: {
            reference: generateReference(),
            userId,
            idempotencyKey,
            description: input.description,
            amount,
            currency: input.currency,
            history: { create: { status: "PENDING", changedById: userId } },
          },
        });
        res.status(201).json({ transaction: toView(created) });
        return;
      } catch (error) {
        // A parallel request with the same (user, idempotencyKey) wins the unique
        // constraint; fall back to the replay/conflict path instead of duplicating.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }

      const winner = await prisma.transaction.findUniqueOrThrow({ where });
      if (hashPayload(winner.description, winner.amount, winner.currency) !== signature) {
        throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was already used with a different payload");
      }
      res.status(200).json({ transaction: toView(winner) });
    } catch (error) { next(error); }
  });

  router.get("/", authenticate, async (req, res, next) => {
    try {
      const query = parseQuery(listQuery, req.query);
      const where = {
        userId: currentUser(res).id,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? { OR: [
              { reference: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
            ] }
          : {}),
      };
      const [total, rows] = await prisma.$transaction([
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
          where,
          orderBy: { createdAt: query.sort === "createdAt:asc" ? "asc" : "desc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);
      res.json({ transactions: rows.map(toView), page: query.page, pageSize: query.pageSize, total });
    } catch (error) { next(error); }
  });

  return router;
}
