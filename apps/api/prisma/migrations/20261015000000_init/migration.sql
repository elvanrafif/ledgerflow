CREATE TYPE "Currency" AS ENUM ('IDR', 'USD', 'SGD');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transaction_amount_positive" CHECK ("amount" > 0)
);

CREATE TABLE "TransactionStatusHistory" (
  "id" UUID NOT NULL,
  "transactionId" UUID NOT NULL,
  "previousStatus" "TransactionStatus",
  "status" "TransactionStatus" NOT NULL,
  "changedById" UUID NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransactionStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");
CREATE UNIQUE INDEX "Transaction_userId_idempotencyKey_key" ON "Transaction"("userId", "idempotencyKey");
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE INDEX "Transaction_userId_status_createdAt_idx" ON "Transaction"("userId", "status", "createdAt");
CREATE INDEX "TransactionStatusHistory_transactionId_createdAt_idx" ON "TransactionStatusHistory"("transactionId", "createdAt");

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionStatusHistory" ADD CONSTRAINT "TransactionStatusHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionStatusHistory" ADD CONSTRAINT "TransactionStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
