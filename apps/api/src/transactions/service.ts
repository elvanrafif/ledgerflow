import { Prisma, type Currency, type Transaction } from "@prisma/client";
import { AppError } from "../errors.js";
import { toAmount } from "./amount.js";
import { generateReference } from "./reference.js";
import { isEditable, isPermittedTransition, type TransactionStatus } from "./status.js";
import { toHistoryView, toView } from "./view.js";
import type { TransactionRepository } from "./repository.js";

/** Hash of the fields that define "the same transaction" for idempotency. */
function payloadSignature(description: string, amount: Prisma.Decimal, currency: string) {
  return `${description}\u0000${amount.toFixed(2)}\u0000${currency}`;
}

export interface CreateInput {
  userId: string;
  idempotencyKey: string;
  description: string;
  amount: string | number;
  currency: Currency;
}

export interface ListInput {
  userId: string;
  status?: TransactionStatus;
  search?: string;
  sort: "createdAt:asc" | "createdAt:desc";
  page: number;
  pageSize: number;
}

/**
 * Transaction business rules. Owns idempotency, the edit-while-PENDING rule, and
 * the status state machine. Depends on the repository (data) and status rules,
 * not on Express or Prisma directly.
 */
export class TransactionService {
  constructor(private readonly repo: TransactionRepository) {}

  /**
   * Create with idempotency. Same (user, key) + same payload replays the existing
   * row (200); same key + different payload is a 409. A parallel insert that wins
   * the unique constraint falls back to the replay path instead of duplicating.
   */
  async create(input: CreateInput): Promise<{ transaction: Transaction; created: boolean }> {
    const amount = toAmount(input.amount);
    const signature = payloadSignature(input.description, amount, input.currency);

    const existing = await this.repo.findByIdempotencyKey(input.userId, input.idempotencyKey);
    if (existing) return { transaction: this.assertSamePayload(existing, signature), created: false };

    try {
      const transaction = await this.repo.create({
        reference: generateReference(),
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        description: input.description,
        amount,
        currency: input.currency,
      });
      return { transaction, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }

    const winner = await this.repo.findByIdempotencyKeyOrThrow(input.userId, input.idempotencyKey);
    return { transaction: this.assertSamePayload(winner, signature), created: false };
  }

  private assertSamePayload(existing: Transaction, signature: string): Transaction {
    if (payloadSignature(existing.description, existing.amount, existing.currency) !== signature) {
      throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was already used with a different payload");
    }
    return existing;
  }

  async list(input: ListInput) {
    const { total, rows } = await this.repo.list(input.userId, input);
    return {
      transactions: rows.map(toView),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }

  async detail(userId: string, id: string) {
    const transaction = await this.repo.findOwnedOrThrow(userId, id);
    const history = await this.repo.historyFor(transaction.id);
    return { ...toView(transaction), history: history.map(toHistoryView) };
  }

  async updateDescription(userId: string, id: string, description: string): Promise<Transaction> {
    const transaction = await this.repo.findOwnedOrThrow(userId, id);
    if (!isEditable(transaction.status)) {
      throw new AppError(409, "INVALID_STATUS_FOR_EDIT", "Only pending transactions can be edited");
    }
    return this.repo.updateDescription(transaction.id, description);
  }

  /**
   * Transition status atomically. The row is locked and its committed status
   * re-read inside the transaction, so concurrent requests can't both act on a
   * stale snapshot. Appends one history row per valid transition.
   */
  async changeStatus(
    userId: string,
    id: string,
    to: "PROCESSING" | "COMPLETED" | "FAILED",
    note?: string,
  ): Promise<Transaction> {
    return this.repo.runStatusChange(async (tx) => {
      const locked = await tx.$queryRaw<{ status: TransactionStatus }[]>`
        SELECT "status" FROM "Transaction"
        WHERE "id" = ${id}::uuid AND "userId" = ${userId}::uuid
        FOR UPDATE
      `;
      if (locked.length === 0) throw new AppError(404, "NOT_FOUND", "Transaction not found");

      const from = locked[0].status;
      if (!isPermittedTransition(from, to)) {
        throw new AppError(409, "INVALID_TRANSITION", `Cannot move a ${from} transaction to ${to}`);
      }
      const updated = await tx.transaction.update({ where: { id }, data: { status: to } });
      await tx.transactionStatusHistory.create({
        data: { transactionId: id, previousStatus: from, status: to, changedById: userId, note },
      });
      return updated;
    });
  }

  /** Dashboard summary with every status present (zero-filled) and per-currency totals. */
  async summary(userId: string) {
    const { total, grouped, byCurrency } = await this.repo.summary(userId);
    const statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
    const byStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<string, number>;
    for (const row of grouped) byStatus[row.status] = row._count._all;

    return {
      total,
      byStatus,
      totalsByCurrency: byCurrency.map((row) => ({
        currency: row.currency,
        total: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      })),
    };
  }
}
