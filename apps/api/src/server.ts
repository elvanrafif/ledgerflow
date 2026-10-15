import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });

await prisma.$connect();

createApp(async () => {
  await prisma.$queryRaw`SELECT 1`;
}, {
  prisma,
  frontendOrigin: config.frontendOrigin,
  sessionSecret: config.sessionSecret,
  nodeEnv: config.nodeEnv,
}).listen(config.port, () => {
  console.info(`LedgerFlow API listening on port ${config.port}`);
});
