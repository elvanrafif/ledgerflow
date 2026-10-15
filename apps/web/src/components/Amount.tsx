/**
 * Amount rendering.
 *
 * The API serializes money as a DECIMAL(18,2) **string** (e.g. "1500000.00").
 * We must never parse it into a JS number: Number("9007199254740993.99") is not
 * representable and silently loses precision on large IDR values. So we split the
 * string into integer and fraction parts and localize each side independently.
 *
 * Currencies are never combined here. One Amount = one currency.
 */

export type Currency = "IDR" | "USD" | "SGD";

export const CURRENCIES: readonly Currency[] = ["IDR", "USD", "SGD"] as const;

const SYMBOLS: Record<Currency, string> = {
  IDR: "Rp",
  USD: "$",
  SGD: "S$",
};

/**
 * Group the integer part with thousands separators, from the right.
 * Works on the raw digit string, so it is exact at any magnitude.
 */
function groupInteger(digits: string, separator: string): string {
  const negative = digits.startsWith("-");
  const body = negative ? digits.slice(1) : digits;
  const grouped = body.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return negative ? `-${grouped}` : grouped;
}

/**
 * Normalize a raw string amount into { sign, integer, fraction } without any
 * numeric conversion. Tolerates values with or without a decimal part and
 * negative values.
 */
function splitAmount(value: string): { negative: boolean; integer: string; fraction: string } {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [rawInt = "0", rawFraction = ""] = unsigned.split(".");
  const integer = rawInt === "" ? "0" : rawInt;
  return { negative, integer, fraction: rawFraction };
}

/**
 * Format a string amount for display. Never uses Number() or parseFloat(), so
 * precision is preserved for arbitrarily large values.
 *
 * - IDR uses "." as thousands separator and "," as the decimal separator.
 * - USD / SGD use "," and "." respectively, with the currency symbol prefixed.
 */
export function formatAmount(value: string, currency: Currency): string {
  const { negative, integer, fraction } = splitAmount(value);

  if (currency === "IDR") {
    const grouped = groupInteger(integer, ".");
    const decimals = fraction.slice(0, 2).padEnd(2, "0");
    const body = `${grouped},${decimals}`;
    return negative ? `-${body}` : body;
  }

  const grouped = groupInteger(integer, ",");
  const decimals = fraction.slice(0, 2).padEnd(2, "0");
  const body = `${grouped}.${decimals}`;
  return `${negative ? "-" : ""}${SYMBOLS[currency]}${body}`;
}

export interface AmountProps {
  /** The raw string amount from the API, e.g. "1500000.00". Never a number. */
  value: string;
  currency: Currency;
  /** Show the currency code next to the figure (used where the symbol is ambiguous). */
  showCode?: boolean;
  className?: string;
}

export function Amount({ value, currency, showCode = false, className }: AmountProps) {
  const formatted = formatAmount(value, currency);
  return (
    <span className={["amount", className].filter(Boolean).join(" ")} data-currency={currency}>
      {formatted}
      {showCode ? ` ${currency}` : null}
    </span>
  );
}
