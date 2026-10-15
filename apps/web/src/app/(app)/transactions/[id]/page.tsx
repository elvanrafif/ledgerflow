import Link from "next/link";
import { serverFetch } from "@/lib/server-fetch";
import { ApiError } from "@/lib/api-client";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { buttonLinkStyle } from "@/components/button-link";
import { TransactionDetail } from "./transaction-detail";
import type { TransactionDetailResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { transaction } = await serverFetch<TransactionDetailResponse>(`/transactions/${id}`);
    return <TransactionDetail transaction={transaction} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          title="Transaction not found"
          body="It may have been removed, or it belongs to another account."
          action={
            <Link href="/transactions" style={buttonLinkStyle("secondary")}>
              Back to transactions
            </Link>
          }
        />
      );
    }
    return (
      <ErrorState
        title="Could not load this transaction"
        message="We could not reach the ledger. Refresh the page to try again."
      />
    );
  }
}
