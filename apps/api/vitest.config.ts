import { defineConfig } from "vitest/config";

/**
 * Load apps/api/.env before the suite runs. Bun auto-loads it when running the
 * server, but `bunx vitest run` does not, so the Prisma client inside tests
 * could not see DATABASE_URL and every DB-backed suite failed. `process.loadEnvFile`
 * is built into Bun/Node (no dependency) and a missing file is ignored so CI,
 * which supplies the variables through the environment, still works.
 */
export default defineConfig({
  test: {
    setupFiles: ["./test/setup-env.ts"],
  },
});
