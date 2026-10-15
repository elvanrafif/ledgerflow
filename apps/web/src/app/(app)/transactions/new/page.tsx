"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { useCreateTransaction } from "@/features/transactions/use-create-transaction";

/** Create-transaction page: a thin shell over the create-form hook. */
export default function NewTransactionPage() {
  const form = useCreateTransaction();

  return (
    <div style={{ maxWidth: 520 }}>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>New transaction</h1>
        <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)" }}>
          New transactions start as PENDING. You can move them on once created.
        </p>
      </header>

      <form onSubmit={form.submit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {form.formError ? <ErrorState message={form.formError} /> : null}

        <Field
          label="Description"
          name="description"
          value={form.values.description}
          error={form.errors.description}
          onChange={(event) => form.setDescription(event.target.value)}
        />

        <Field
          label="Amount"
          name="amount"
          inputMode="decimal"
          hint="Digits with up to two decimal places, e.g. 1500000.00"
          value={form.values.amount}
          error={form.errors.amount}
          onChange={(event) => form.setAmount(event.target.value)}
        />

        <SelectField
          label="Currency"
          name="currency"
          value={form.values.currency}
          error={form.errors.currency}
          onChange={(event) => form.setCurrency(event.target.value)}
        >
          <option value="IDR">IDR</option>
          <option value="USD">USD</option>
          <option value="SGD">SGD</option>
        </SelectField>

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button type="submit" variant="primary" loading={form.submitting}>
            Create transaction
          </Button>
          <Link href="/transactions">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
