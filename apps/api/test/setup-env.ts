/**
 * Make apps/api/.env visible to the test process. Bun loads it for the server,
 * but `bunx vitest run` does not, so Prisma inside tests saw no DATABASE_URL.
 * A missing file is fine: CI passes the variables through the environment.
 */
try {
  process.loadEnvFile(new URL("../.env", import.meta.url).pathname);
} catch {
  // No .env file (e.g. CI): rely on variables already in the environment.
}
