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
  sessionSecret: "dashboard-test-session-secret-123456",
  nodeEnv: "test",
});
const emails: string[] = [];

async function signUp(name: string) {
  const email = `dash-${randomUUID()}@example.test`;
  emails.push(email);
  const response = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .send({ name, email, password: "a-long-test-password" });
  return { cookie: (response.headers["set-cookie"][0] as string).split(";")[0] };
}

async function createTransaction(cookie: string, amount: string, currency: string) {
  const response = await request(app)
    .post("/api/v1/transactions")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .set("Idempotency-Key", randomUUID())
    .send({ description: `Amount ${amount}`, amount, currency });
  return response.body.transaction.id as string;
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

describe("dashboard summary", () => {
  it("counts the current user's transactions by status without mixing currencies", async () => {
    const owner = await signUp("Dashboard Owner");
    const other = await signUp("Dashboard Other");
    await createTransaction(owner.cookie, "1500000.00", "IDR");
    const toFail = await createTransaction(owner.cookie, "25.00", "USD");
    await createTransaction(other.cookie, "999.00", "USD");

    await request(app)
      .post(`/api/v1/transactions/${toFail}/status`)
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .send({ status: "FAILED" });

    const summary = await request(app).get("/api/v1/dashboard/summary").set("Cookie", owner.cookie);
    expect(summary.status).toBe(200);
    expect(summary.body.total).toBe(2);
    expect(summary.body.byStatus).toEqual({ PENDING: 1, PROCESSING: 0, COMPLETED: 0, FAILED: 1 });
    expect(summary.body.totalsByCurrency).toEqual([
      { currency: "IDR", total: "1500000.00" },
      { currency: "USD", total: "25.00" },
    ]);

    expect((await request(app).get("/api/v1/dashboard/summary")).status).toBe(401);
  });
});
