import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = schema.parse(env);
  return {
    databaseUrl: config.DATABASE_URL,
    sessionSecret: config.SESSION_SECRET,
    port: config.PORT,
    frontendOrigin: config.FRONTEND_ORIGIN,
    nodeEnv: config.NODE_ENV,
  };
}
