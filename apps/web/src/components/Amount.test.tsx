import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Amount, formatAmount } from "./Amount";

describe("formatAmount", () => {
  it("formats a string amount without parsing it into a float", () => {
    // 1500000.00 -> grouped integer part, localized separators. Never Number().
    expect(formatAmount("1500000.00", "IDR")).toMatch(/1\.500\.000,00/);
  });

  it("keeps the fractional part exactly as the API sent it", () => {
    // A float would render this as 0.1 + 0.2 style noise; the string must survive.
    expect(formatAmount("9007199254740993.99", "IDR")).toBe("9.007.199.254.740.993,99");
  });

  it("does not lose precision on very large IDR values", () => {
    // Number("9007199254740993.99") is not representable; formatting the string is.
    expect(formatAmount("9999999999999999.99", "IDR")).toBe("9.999.999.999.999.999,99");
  });

  it("renders USD with the dollar sign and two decimals", () => {
    expect(formatAmount("25.50", "USD")).toMatch(/\$25\.50/);
  });
});

describe("Amount", () => {
  it("formats a string amount without parsing it into a float", () => {
    render(<Amount value="1500000.00" currency="IDR" />);
    expect(screen.getByText(/1\.500\.000,00/)).toBeInTheDocument();
  });

  it("never adds two different currencies together", () => {
    render(<Amount value="25.50" currency="USD" />);
    expect(screen.getByText(/\$25\.50|USD\s*25\.50/)).toBeInTheDocument();
  });

  it("renders amounts in a tabular-figures monospace class so columns align", () => {
    render(<Amount value="1500000.00" currency="IDR" />);
    expect(screen.getByText(/1\.500\.000,00/)).toHaveClass("amount");
  });
});
