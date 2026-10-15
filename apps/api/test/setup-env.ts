/**
 * Make apps/api/.env visible to the test process. Bun loads it for the server,
 * but `bunx vitest run` does not, so Prisma inside tests saw no DATABASE_URL.
 * A missing file is fine: CI passes the variables through the environment.
 */
try {
  process.loadEnvFile(new URL("../.env", import.meta.url).pathname);
} catch (error) {
  // A missing .env is expected (e.g. CI supplies the variables itself). Anything
  // else — a malformed or unreadable file — is a real problem worth surfacing.
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
