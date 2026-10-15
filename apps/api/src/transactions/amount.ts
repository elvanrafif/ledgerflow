import { Prisma } from "@prisma/client";
import { AppError } from "../errors.js";

const MESSAGE = "Amount must be a positive number with at most two decimal places";

/**
 * Parse a client-supplied amount into a Decimal, or reject it as a validation
 * error. Prisma.Decimal throws on non-numeric input (e.g. "abc"), so the parse
 * is wrapped: a malformed amount becomes the intended 400, never a 500 leaking a
 * Decimal library message.
 */
export function toAmount(value: string | number): Prisma.Decimal {
  let amount: Prisma.Decimal;
  try {
    amount = new Prisma.Decimal(value);
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", MESSAGE, { amount: [MESSAGE] });
  }
  if (!amount.isFinite() || amount.lte(0) || !amount.equals(amount.toDecimalPlaces(2))) {
    throw new AppError(400, "VALIDATION_ERROR", MESSAGE, { amount: [MESSAGE] });
  }
  return amount;
}
