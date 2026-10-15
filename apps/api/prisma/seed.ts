import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = "ledgerflow.sample@example.test";

export async function seedUser(prisma: Pick<PrismaClient, "user">, password: string) {
  if (!password) throw new Error("SEED_USER_PASSWORD is required");

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "LedgerFlow Sample", email, passwordHash },
  });
}

if (import.meta.main) {
  const prisma = new PrismaClient();
  try {
    await seedUser(prisma, process.env.SEED_USER_PASSWORD ?? "");
  } finally {
    await prisma.$disconnect();
  }
}
