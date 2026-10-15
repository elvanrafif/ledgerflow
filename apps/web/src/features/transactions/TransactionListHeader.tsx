import Link from "next/link";
import { buttonLinkStyle } from "@/components/button-link";

/** List page heading with the primary "New transaction" action. */
export function TransactionListHeader() {
  return (
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>Transactions</h1>
        <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)" }}>
          Filter, search and sort to find the one you need.
        </p>
      </div>
      <Link href="/transactions/new" style={buttonLinkStyle("primary")}>
        New transaction
      </Link>
    </header>
  );
}
