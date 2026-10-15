import Link from "next/link";
import { Amount } from "@/components/Amount";
import { StatusBadge } from "@/components/StatusBadge";
import type { TransactionDetail } from "@/lib/types";

/** Detail header: back link, reference, description, status and amount. */
export function TransactionDetailHeader({ transaction }: { transaction: TransactionDetail }) {
  return (
    <>
      <div>
        <Link href="/transactions" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          ← Back to transactions
        </Link>
      </div>

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            {transaction.reference}
          </span>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>{transaction.description}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <StatusBadge status={transaction.status} />
            <Amount value={transaction.amount} currency={transaction.currency} showCode />
          </div>
        </div>
      </header>
    </>
  );
}
