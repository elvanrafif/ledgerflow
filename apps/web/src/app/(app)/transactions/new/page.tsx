"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { keyForPayload, type CreatePayload } from "@/lib/idempotency";
import type { Transaction } from "@/lib/types";

interface FormErrors {
  description?: string;
  amount?: string;
  currency?: string;
}

/**
 * Client-side validation is for feedback only; the API is the authority. The
 * amount is kept as a string and sent as a string, never parsed to a float.
 */
function validate(payload: CreatePayload): FormErrors {
  const errors: FormErrors = {};
  if (!payload.description.trim()) errors.description = "Description is required";
  else if (payload.description.trim().length > 500) errors.description = "Description must be 500 characters or fewer";

  if (!payload.amount.trim()) {
    errors.amount = "Amount is required";
  } else if (!/^\d+(\.\d{1,2})?$/.test(payload.amount.trim())) {
    errors.amount = "Use digits with at most two decimal places";
  } else if (Number(payload.amount) <= 0 || /^0+(\.0+)?$/.test(payload.amount.trim())) {
    // Number() is safe here: we only compare for validity, never format from it.
    errors.amount = "Amount must be greater than zero";
  }

  if (!payload.currency) errors.currency = "Currency is required";
  return errors;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Remembers the key for the last payload so a retry reuses it.
  const keyRef = useRef<{ signature: string; key: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const payload: CreatePayload = { description: description.trim(), amount: amount.trim(), currency };
    const localErrors = validate(payload);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    // Same payload -> same key (replay-safe retry); changed payload -> new key.
    const next = keyForPayload(keyRef.current, payload);
    keyRef.current = next;

    setSubmitting(true);
    try {
      const created = await apiFetch<{ transaction: Transaction }>("/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
        idempotencyKey: next.key,
      });
      router.push(`/transactions/${created.transaction.id}`);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Could not create the transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em" }}>New transaction</h1>
        <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-secondary)" }}>
          New transactions start as PENDING. You can move them on once created.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {formError ? <ErrorState message={formError} /> : null}

        <Field
          label="Description"
          name="description"
          value={description}
          error={errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <Field
          label="Amount"
          name="amount"
          inputMode="decimal"
          hint="Digits with up to two decimal places, e.g. 1500000.00"
          value={amount}
          error={errors.amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <SelectField
          label="Currency"
          name="currency"
          value={currency}
          error={errors.currency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          <option value="IDR">IDR</option>
          <option value="USD">USD</option>
          <option value="SGD">SGD</option>
        </SelectField>

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button type="submit" variant="primary" loading={submitting}>
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
