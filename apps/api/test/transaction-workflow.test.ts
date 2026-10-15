import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const prisma = new PrismaClient();
const origin = "http://localhost:3000";
const app = createApp(async () => {}, {
  prisma,
  frontendOrigin: origin,
  sessionSecret: "workflow-test-session-secret-123456",
  nodeEnv: "test",
});
const emails: string[] = [];

async function signUp(name: string) {
  const email = `flow-${randomUUID()}@example.test`;
  emails.push(email);
  const response = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .send({ name, email, password: "a-long-test-password" });
  return { cookie: (response.headers["set-cookie"][0] as string).split(";")[0] };
}

async function createTransaction(cookie: string, amount = "100.00") {
  const response = await request(app)
    .post("/api/v1/transactions")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .set("Idempotency-Key", randomUUID())
    .send({ description: "Seed", amount, currency: "USD" });
  return response.body.transaction.id as string;
}

function transition(cookie: string, id: string, status: string) {
  return request(app)
    .post(`/api/v1/transactions/${id}/status`)
    .set("Origin", origin)
    .set("Cookie", cookie)
    .send({ status });
}

beforeAll(async () => prisma.$connect());
afterEach(async () => {
  const users = { email: { in: emails } };
  await prisma.transactionStatusHistory.deleteMany({ where: { transaction: { user: users } } });
  await prisma.transaction.deleteMany({ where: { user: users } });
  await prisma.session.deleteMany({ where: { user: users } });
  await prisma.user.deleteMany({ where: users });
  emails.length = 0;
});
afterAll(async () => prisma.$disconnect());

describe("transaction detail and editing", () => {
  it("returns details with status history for the owner and hides other users' records", async () => {
    const owner = await signUp("Owner");
    const other = await signUp("Other");
    const id = await createTransaction(owner.cookie);

    const detail = await request(app).get(`/api/v1/transactions/${id}`).set("Cookie", owner.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.transaction.history).toHaveLength(1);
    expect(detail.body.transaction.history[0]).toMatchObject({ status: "PENDING", previousStatus: null });

    expect((await request(app).get(`/api/v1/transactions/${id}`).set("Cookie", other.cookie)).status).toBe(404);
    expect((await request(app).get(`/api/v1/transactions/${randomUUID()}`).set("Cookie", owner.cookie)).status).toBe(404);
  });

  it("updates only the description while pending and rejects protected fields", async () => {
    const owner = await signUp("Editor");
    const id = await createTransaction(owner.cookie);

    const updated = await request(app)
      .patch(`/api/v1/transactions/${id}`)
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .send({ description: "Renamed" });
    expect(updated.status).toBe(200);
    expect(updated.body.transaction.description).toBe("Renamed");

    const protectedField = await request(app)
      .patch(`/api/v1/transactions/${id}`)
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .send({ description: "Changed", amount: "999.00" });
    expect(protectedField.status).toBe(400);
    expect(protectedField.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("transaction status workflow", () => {
  it("applies permitted transitions atomically and records history", async () => {
    const owner = await signUp("Mover");
    const id = await createTransaction(owner.cookie);

    expect((await transition(owner.cookie, id, "PROCESSING")).status).toBe(200);
    expect((await transition(owner.cookie, id, "COMPLETED")).status).toBe(200);

    const detail = await request(app).get(`/api/v1/transactions/${id}`).set("Cookie", owner.cookie);
    expect(detail.body.transaction.status).toBe("COMPLETED");
    const history = detail.body.transaction.history;
    expect(history.map((row: { status: string }) => row.status)).toEqual(["PENDING", "PROCESSING", "COMPLETED"]);
    expect(history[1].previousStatus).toBe("PENDING");
  });

  it("rejects invalid and terminal transitions with a conflict", async () => {
    const owner = await signUp("Blocker");
    const id = await createTransaction(owner.cookie);

    const skipped = await transition(owner.cookie, id, "COMPLETED");
    expect(skipped.status).toBe(409);
    expect(skipped.body.error.code).toBe("INVALID_TRANSITION");

    expect((await transition(owner.cookie, id, "FAILED")).status).toBe(200);
    const terminal = await transition(owner.cookie, id, "PROCESSING");
    expect(terminal.status).toBe(409);

    const record = await prisma.transaction.findUnique({ where: { id } });
    expect(record?.status).toBe("FAILED");
    const count = await prisma.transactionStatusHistory.count({ where: { transactionId: id } });
    expect(count).toBe(2);

    const editingTerminal = await request(app)
      .patch(`/api/v1/transactions/${id}`)
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .send({ description: "Too late" });
    expect(editingTerminal.status).toBe(409);
    expect(editingTerminal.body.error.code).toBe("INVALID_STATUS_FOR_EDIT");
  });

  it("hides other users' transactions from transitions", async () => {
    const owner = await signUp("Mine");
    const other = await signUp("Theirs");
    const id = await createTransaction(owner.cookie);

    expect((await transition(other.cookie, id, "PROCESSING")).status).toBe(404);
  });

  it("rejects the losing transition when two requests race for the same row", async () => {
    const owner = await signUp("Concurrent");
    const id = await createTransaction(owner.cookie);

    // Both requests target terminal states from PENDING; only one can win.
    const results = await Promise.all([
      transition(owner.cookie, id, "COMPLETED"),
      transition(owner.cookie, id, "FAILED"),
    ]);

    const record = await prisma.transaction.findUniqueOrThrow({ where: { id } });
    const history = await prisma.transactionStatusHistory.findMany({
      where: { transactionId: id },
      orderBy: { createdAt: "asc" },
    });

    const wins = results.filter((result) => result.status === 200);
    const losses = results.filter((result) => result.status === 409);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect(losses[0].body.error.code).toBe("INVALID_TRANSITION");

    // Initial PENDING plus exactly one winning transition.
    expect(history.map((row) => row.status)).toEqual(["PENDING", record.status]);
  });
});
