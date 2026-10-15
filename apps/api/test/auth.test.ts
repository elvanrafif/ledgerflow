import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const prisma = new PrismaClient();
const origin = "http://localhost:3000";
const createdEmails: string[] = [];

const app = createApp(async () => {}, {
  prisma,
  frontendOrigin: origin,
  sessionSecret: "test-session-secret-with-adequate-length",
  nodeEnv: "test",
});

beforeAll(async () => prisma.$connect());
afterEach(async () => {
  await prisma.session.deleteMany({ where: { user: { email: { in: createdEmails } } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  createdEmails.length = 0;
});
afterAll(async () => prisma.$disconnect());

describe("authentication", () => {
  it("registers, returns a public profile, and invalidates the session on logout", async () => {
    const email = `auth-${randomUUID()}@example.test`;
    createdEmails.push(email.toLowerCase());

    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", origin)
      .send({ name: "Test User", email: ` ${email.toUpperCase()} `, password: "a-long-test-password" });

    expect(registered.status).toBe(201);
    expect(registered.body.user).toMatchObject({ name: "Test User", email: email.toLowerCase() });
    expect(registered.body.user.passwordHash).toBeUndefined();
    const setCookie = registered.headers["set-cookie"][0] as string;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/api/v1");
    expect(setCookie).not.toContain("Secure");
    expect(await prisma.session.count()).toBeGreaterThan(0);
    const cookie = setCookie.split(";")[0];

    const profile = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(profile.status).toBe(200);
    expect(profile.body.user).toEqual(registered.body.user);

    const loggedOut = await request(app)
      .post("/api/v1/auth/logout")
      .set("Origin", origin)
      .set("Cookie", cookie);
    expect(loggedOut.status).toBe(200);

    const afterLogout = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(afterLogout.status).toBe(401);
  });

  it("logs in with the registered password and rejects invalid credentials", async () => {
    const email = `login-${randomUUID()}@example.test`;
    createdEmails.push(email);
    await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", origin)
      .send({ name: "Login User", email, password: "a-long-test-password" });

    const invalid = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", origin)
      .send({ email, password: "wrong-password" });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe("INVALID_CREDENTIALS");

    const loggedIn = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", origin)
      .send({ email: email.toUpperCase(), password: "a-long-test-password" });
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.headers["set-cookie"]).toBeDefined();
  });

  it("rejects duplicate registrations and cross-origin state changes", async () => {
    const email = `duplicate-${randomUUID()}@example.test`;
    createdEmails.push(email);
    const body = { name: "Duplicate User", email, password: "a-long-test-password" };
    expect((await request(app).post("/api/v1/auth/register").set("Origin", origin).send(body)).status).toBe(201);
    const duplicate = await request(app).post("/api/v1/auth/register").set("Origin", origin).send(body);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_EXISTS");

    const forbidden = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "https://attacker.example")
      .send({ email, password: "a-long-test-password" });
    expect(forbidden.status).toBe(403);
  });

  it("returns field validation details and rejects passwords over bcrypt's byte limit", async () => {
    const invalid = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", origin)
      .send({ name: " ", email: "bad", password: "x".repeat(24) });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalid.body.error.details).toHaveProperty("email");

    const multibytePassword = "é".repeat(40);
    const tooLong = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", origin)
      .send({ name: "Unicode User", email: `unicode-${randomUUID()}@example.test`, password: multibytePassword });
    expect(tooLong.status).toBe(400);
  });

  it("rate limits repeated authentication requests", async () => {
    const limitedApp = createApp(async () => {}, {
      prisma,
      frontendOrigin: origin,
      sessionSecret: "another-test-session-secret-long-enough",
      nodeEnv: "test",
    });
    for (let index = 0; index < 10; index++) {
      const response = await request(limitedApp)
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({});
      expect(response.status).toBe(400);
    }
    const limited = await request(limitedApp)
      .post("/api/v1/auth/login")
      .set("Origin", origin)
      .send({});
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("AUTH_RATE_LIMITED");
  });
});
