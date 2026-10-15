import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { seedUser } from "../prisma/seed.js";

describe("seedUser", () => {
  it("upserts one synthetic user and stores only a password hash", async () => {
    const users = new Map<string, { email: string; name: string; passwordHash: string }>();
    const prisma = {
      user: {
        upsert: vi.fn(async ({ where, create }) => {
          const existing = users.get(where.email);
          if (existing) return existing;
          users.set(where.email, create);
          return create;
        }),
      },
    };

    await seedUser(prisma as never, "local-only-password");
    await seedUser(prisma as never, "local-only-password");

    expect(users.size).toBe(1);
    expect(users.get("ledgerflow.sample@example.test")?.passwordHash).not.toBe("local-only-password");
    await expect(bcrypt.compare("local-only-password", users.get("ledgerflow.sample@example.test")!.passwordHash)).resolves.toBe(true);
  });
});
