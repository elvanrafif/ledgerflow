import { Prisma, type Currency, type PrismaClient, type Transaction, type TransactionStatus } from "@prisma/client";
import { AppError } from "../errors.js";

/**
 * Data access for transactions. Owns every Prisma call for this domain so the
 * service layer holds business rules without knowing the ORM. Methods take
 * plain values and return rows; they never throw business errors themselves
 * (except where "not found" IS the data-level fact).
 */
export class TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Find an owned transaction, or throw 404 (ownership is the query, not a check). */
  async findOwnedOrThrow(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) throw new AppError(404, "NOT_FOUND", "Transaction not found");
    return transaction;
  }

  findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
  }

  findByIdempotencyKeyOrThrow(userId: string, idempotencyKey: string): Promise<Transaction> {
    return this.prisma.transaction.findUniqueOrThrow({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
  }

  create(data: {
    reference: string;
    userId: string;
    idempotencyKey: string;
    description: string;
    amount: Prisma.Decimal;
    currency: Currency;
  }): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: { ...data, history: { create: { status: "PENDING", changedById: data.userId } } },
    });
  }

  updateDescription(id: string, description: string): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data: { description } });
  }

  /** Count + page rows for a user in one round trip. */
  async list(userId: string, query: {
    status?: TransactionStatus;
    search?: string;
    sort: "createdAt:asc" | "createdAt:desc";
    page: number;
    pageSize: number;
  }): Promise<{ total: number; rows: Transaction[] }> {
    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [
            { reference: { contains: query.search, mode: "insensitive" as const } },
            { description: { contains: query.search, mode: "insensitive" as const } },
          ] }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: query.sort === "createdAt:asc" ? "asc" : "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { total, rows };
  }

  historyFor(transactionId: string) {
    return this.prisma.transactionStatusHistory.findMany({
      where: { transactionId },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Dashboard aggregates: total, per-status counts, per-currency sums. */
  async summary(userId: string) {
    const [total, grouped, byCurrency] = await Promise.all([
      this.prisma.transaction.count({ where: { userId } }),
      this.prisma.transaction.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
      this.prisma.transaction.groupBy({
        by: ["currency"],
        where: { userId },
        _sum: { amount: true },
        orderBy: { currency: "asc" },
      }),
    ]);
    return { total, grouped, byCurrency };
  }

  /**
   * Change status atomically: lock the row, re-read its committed status, and
   * append history in one transaction. The callback receives the transaction
   * client so the caller can't accidentally use the unlocked connection.
   */
  runStatusChange<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
