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
  sessionSecret: "prd-sweep-session-secret-12345678",
  nodeEnv: "test",
});
const emails: string[] = [];

async function signUp(name: string) {
  const email = `sweep-${randomUUID()}@example.test`;
  emails.push(email);
  const response = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .send({ name, email, password: "a-long-test-password" });
  return { cookie: (response.headers["set-cookie"][0] as string).split(";")[0], userId: response.body.user.id as string };
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

describe("PRD alignment", () => {
  it("records the initiating user on every history entry and never leaks hashes", async () => {
    const owner = await signUp("Historian");
    const created = await request(app)
      .post("/api/v1/transactions")
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .set("Idempotency-Key", randomUUID())
      .send({ description: "Tracked", amount: "75.00", currency: "SGD" });
    const id = created.body.transaction.id as string;
    await request(app).post(`/api/v1/transactions/${id}/status`).set("Origin", origin)
      .set("Cookie", owner.cookie).send({ status: "PROCESSING", note: "started" });

    const detail = await request(app).get(`/api/v1/transactions/${id}`).set("Cookie", owner.cookie);
    const history = detail.body.transaction.history as { changedById: string; note: string | null }[];
    expect(history).toHaveLength(2);
    expect(history.every((row) => row.changedById === owner.userId)).toBe(true);
    expect(history[1].note).toBe("started");
    expect(JSON.stringify(detail.body)).not.toContain("passwordHash");
  });

  it("uses one consistent error shape across validation, auth, and conflicts", async () => {
    const shapes = await Promise.all([
      request(app).get("/api/v1/transactions"),
      request(app).post("/api/v1/auth/register").set("Origin", origin).send({}),
      request(app).get("/api/v1/nope"),
    ]);
    for (const response of shapes) {
      expect(response.body.error).toBeTypeOf("object");
      expect(response.body.error.code).toBeTypeOf("string");
      expect(response.body.error.message).toBeTypeOf("string");
    }
    expect(shapes[0].status).toBe(401);
    expect(shapes[0].body.error.code).toBe("UNAUTHENTICATED");
    expect(shapes[1].status).toBe(400);
    expect(shapes[2].status).toBe(404);
  });

  it("refuses a second user access to list, detail, edit, and status endpoints", async () => {
    const owner = await signUp("Real");
    const intruder = await signUp("Intruder");
    const created = await request(app)
      .post("/api/v1/transactions")
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .set("Idempotency-Key", randomUUID())
      .send({ description: "Private", amount: "9.00", currency: "USD" });
    const id = created.body.transaction.id as string;

    const list = await request(app).get("/api/v1/transactions").set("Cookie", intruder.cookie);
    expect(list.body.transactions).toEqual([]);
    expect(list.body.total).toBe(0);

    expect((await request(app).get(`/api/v1/transactions/${id}`).set("Cookie", intruder.cookie)).status).toBe(404);
    expect((await request(app).patch(`/api/v1/transactions/${id}`).set("Origin", origin).set("Cookie", intruder.cookie).send({ description: "Stolen" })).status).toBe(404);
    expect((await request(app).post(`/api/v1/transactions/${id}/status`).set("Origin", origin).set("Cookie", intruder.cookie).send({ status: "PROCESSING" })).status).toBe(404);
  });

  it("rejects state changes that omit the Origin header", async () => {
    const owner = await signUp("NoOrigin");
    const created = await request(app)
      .post("/api/v1/transactions")
      .set("Origin", origin)
      .set("Cookie", owner.cookie)
      .set("Idempotency-Key", randomUUID())
      .send({ description: "Guarded", amount: "11.00", currency: "USD" });
    const id = created.body.transaction.id as string;

    const noOrigin = await request(app)
      .patch(`/api/v1/transactions/${id}`)
      .set("Cookie", owner.cookie)
      .send({ description: "Unsafe" });
    expect(noOrigin.status).toBe(403);
    expect(noOrigin.body.error.code).toBe("ORIGIN_FORBIDDEN");
  });
});
