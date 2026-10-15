import { TransactionList } from "./transaction-list";

/** Page entry point: reads the URL and hands it to the client list. */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <TransactionList searchParams={params} />;
}
