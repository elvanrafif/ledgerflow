import Link from "next/link";
import { Amount } from "@/components/Amount";
import { StatusBadge } from "@/components/StatusBadge";
import type { Transaction } from "@/lib/types";

/** The ledger table. Columns are the ones the reader decides on. */
export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-default)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <caption style={visuallyHidden}>Transactions</caption>
        <thead>
          <tr>
            <Th>Reference</Th>
            <Th>Status</Th>
            <Th align="right">Amount</Th>
            <Th>Description</Th>
            <Th>Created</Th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} style={{ borderTop: "1px solid var(--border-default)" }}>
              <Td>
                <Link
                  href={`/transactions/${transaction.id}`}
                  style={{ color: "var(--interactive-primary)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}
                >
                  {transaction.reference}
                </Link>
              </Td>
              <Td>
                <StatusBadge status={transaction.status} />
              </Td>
              <Td align="right">
                <Amount value={transaction.amount} currency={transaction.currency} showCode />
              </Td>
              <Td>{transaction.description}</Td>
              <Td>
                <time dateTime={transaction.createdAt}>{new Date(transaction.createdAt).toISOString().slice(0, 10)}</time>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      style={{
        textAlign: align,
        padding: "var(--space-3) var(--space-4)",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td style={{ textAlign: align, padding: "var(--space-3) var(--space-4)", verticalAlign: "middle" }}>{children}</td>;
}

const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
