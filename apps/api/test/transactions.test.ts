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
  sessionSecret: "transactions-test-session-secret-1234",
  nodeEnv: "test",
});
const emails: string[] = [];

async function signUp(name: string) {
  const email = `txn-${randomUUID()}@example.test`;
  emails.push(email);
  const response = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .send({ name, email, password: "a-long-test-password" });
  return { cookie: (response.headers["set-cookie"][0] as string).split(";")[0], userId: response.body.user.id as string };
}

function create(body: { description: string; amount: string; currency: string }, cookie: string, key = randomUUID()) {
  return request(app)
    .post("/api/v1/transactions")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .set("Idempotency-Key", key)
    .send(body);
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

describe("transactions", () => {
  it("creates a pending transaction with initial history and rejects unauthenticated access", async () => {
    const { cookie, userId } = await signUp("Creator");
    const anonymous = await request(app).get("/api/v1/transactions");
    expect(anonymous.status).toBe(401);

    const created = await create({ description: "Invoice 1", amount: "150000.00", currency: "IDR" }, cookie);
    expect(created.status).toBe(201);
    expect(created.body.transaction).toMatchObject({
      description: "Invoice 1",
      amount: "150000.00",
      currency: "IDR",
      status: "PENDING",
    });
    expect(created.body.transaction.reference).toMatch(/^TXN-/);

    const history = await prisma.transactionStatusHistory.findMany({
      where: { transactionId: created.body.transaction.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ status: "PENDING", previousStatus: null, changedById: userId });
  });

  it("rejects invalid amounts, unknown currencies, and cross-origin writes", async () => {
    const { cookie } = await signUp("Validator");
    expect((await create({ description: "Zero", amount: "0", currency: "IDR" }, cookie)).status).toBe(400);
    expect((await create({ description: "Negative", amount: "-5", currency: "IDR" }, cookie)).status).toBe(400);
    expect((await create({ description: "Float", amount: "10.999", currency: "USD" }, cookie)).status).toBe(400);
    const currency = await create({ description: "Bad currency", amount: "10", currency: "EUR" }, cookie);
    expect(currency.status).toBe(400);
    expect(currency.body.error.code).toBe("VALIDATION_ERROR");

    const crossOrigin = await request(app)
      .post("/api/v1/transactions")
      .set("Origin", "https://attacker.example")
      .set("Cookie", cookie)
      .set("Idempotency-Key", randomUUID())
      .send({ description: "Evil", amount: "10", currency: "USD" });
    expect(crossOrigin.status).toBe(403);
  });

  it("replays the same idempotency key and conflicts on a changed payload", async () => {
    const { cookie } = await signUp("Retrier");
    const key = randomUUID();
    const body = { description: "Retry me", amount: "25.50", currency: "USD" };

    const first = await create(body, cookie, key);
    expect(first.status).toBe(201);
    const replay = await create(body, cookie, key);
    expect(replay.status).toBe(200);
    expect(replay.body.transaction.id).toBe(first.body.transaction.id);

    const conflict = await create({ ...body, amount: "99.00" }, cookie, key);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("does not create duplicates when the same key races in parallel", async () => {
    const { cookie } = await signUp("Race");
    const key = randomUUID();
    const body = { description: "Race me", amount: "12.00", currency: "SGD" };

    const responses = await Promise.all([
      create(body, cookie, key),
      create(body, cookie, key),
      create(body, cookie, key),
    ]);

    const created = responses.filter((response) => response.status === 201);
    expect(created).toHaveLength(1);
    const ids = new Set(responses.map((response) => response.body.transaction.id));
    expect(ids.size).toBe(1);
    expect(await prisma.transaction.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("lists only the owner's transactions with filters, sorting, and pagination", async () => {
    const owner = await signUp("Owner");
    const other = await signUp("Other");
    for (const description of ["Alpha", "Beta", "Gamma"]) {
      expect((await create({ description, amount: "10.00", currency: "SGD" }, owner.cookie)).status).toBe(201);
    }
    await create({ description: "Hidden", amount: "10.00", currency: "SGD" }, other.cookie);

    const list = await request(app).get("/api/v1/transactions?pageSize=2&page=1&sort=createdAt:asc").set("Cookie", owner.cookie);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(3);
    expect(list.body.transactions).toHaveLength(2);
    expect(list.body.transactions[0].description).toBe("Alpha");

    const searched = await request(app).get("/api/v1/transactions?search=Beta").set("Cookie", owner.cookie);
    expect(searched.body.transactions.map((row: { description: string }) => row.description)).toEqual(["Beta"]);

    const filtered = await request(app).get("/api/v1/transactions?status=FAILED").set("Cookie", owner.cookie);
    expect(filtered.body.transactions).toEqual([]);

    const invalid = await request(app).get("/api/v1/transactions?pageSize=101").set("Cookie", owner.cookie);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });
});
