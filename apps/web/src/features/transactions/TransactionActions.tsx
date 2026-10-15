import { Button } from "@/components/Button";
import { STATUS_LABELS } from "@/lib/status-labels";
import type { TransactionStatus } from "@/lib/types";

/** Transition controls: only permitted moves, with FAILED styled as destructive. */
export function TransactionActions({
  status,
  moves,
  onRequest,
}: {
  status: TransactionStatus;
  moves: TransactionStatus[];
  onRequest: (next: TransactionStatus) => void;
}) {
  if (moves.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--text-secondary)" }}>
        This transaction is {STATUS_LABELS[status].toLowerCase()}; no further changes are possible.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
      {moves.map((move) => (
        <Button key={move} variant={move === "FAILED" ? "danger" : "primary"} onClick={() => onRequest(move)}>
          {STATUS_LABELS[move]}
        </Button>
      ))}
    </div>
  );
}
