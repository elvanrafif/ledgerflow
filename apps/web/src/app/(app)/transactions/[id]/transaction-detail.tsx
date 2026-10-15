"use client";

import { ErrorState } from "@/components/ErrorState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTransactionDetail } from "@/features/transactions/use-transaction-detail";
import { TransactionDetailHeader } from "@/features/transactions/TransactionDetailHeader";
import { DetailSection } from "@/features/transactions/DetailSection";
import { TransactionActions } from "@/features/transactions/TransactionActions";
import { TransactionDescriptionEditor } from "@/features/transactions/TransactionDescriptionEditor";
import { TransactionHistoryTimeline } from "@/features/transactions/TransactionHistoryTimeline";
import { STATUS_LABELS } from "@/lib/status-labels";
import type { TransactionDetail as TransactionDetailData } from "@/lib/types";

/**
 * Transaction detail page. Composes the detail hook with presentational
 * sections; it holds no fetch or layout logic itself.
 */
export function TransactionDetail({ transaction }: { transaction: TransactionDetailData }) {
  const detail = useTransactionDetail(transaction);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <TransactionDetailHeader transaction={detail.current} />

      {detail.error ? <ErrorState message={detail.error} /> : null}

      <DetailSection id="actions" title="Actions">
        <TransactionActions status={detail.current.status} moves={detail.moves} onRequest={detail.requestTransition} />
      </DetailSection>

      <DetailSection id="description" title="Description">
        <TransactionDescriptionEditor
          description={detail.description}
          editable={detail.editable}
          editing={detail.editing}
          saving={detail.saveBusy}
          onChange={detail.setDescription}
          onStartEdit={() => detail.setEditing(true)}
          onCancelEdit={detail.cancelEdit}
          onSave={detail.saveDescription}
        />
      </DetailSection>

      <DetailSection id="history" title="Status history">
        <TransactionHistoryTimeline entries={detail.current.history} />
      </DetailSection>

      <ConfirmDialog
        open={detail.pending !== null}
        title={`Move to ${detail.pending ? STATUS_LABELS[detail.pending] : ""}?`}
        body="This change cannot be undone. The transaction will be final in its new status."
        confirmLabel={detail.pending ? STATUS_LABELS[detail.pending] : "Confirm"}
        destructive={detail.pending === "FAILED"}
        busy={detail.busy}
        onConfirm={detail.confirmTransition}
        onCancel={detail.cancelTransition}
      />
    </div>
  );
}
