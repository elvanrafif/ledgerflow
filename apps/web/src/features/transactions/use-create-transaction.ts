"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { keyForPayload, type CreatePayload } from "@/lib/idempotency";
import type { Transaction } from "@/lib/types";

export interface CreateFormErrors {
  description?: string;
  amount?: string;
  currency?: string;
}

/**
 * Client-side validation is for feedback only; the API is the authority. The
 * amount is kept as a string and never parsed to a float for formatting.
 */
export function validateCreatePayload(payload: CreatePayload): CreateFormErrors {
  const errors: CreateFormErrors = {};
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

/**
 * Create-transaction form state. Owns the fields, feedback-only validation, the
 * idempotency key lifecycle (one key per payload; reused on retry, regenerated
 * when the payload changes), and the submit → redirect.
 */
export function useCreateTransaction() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [errors, setErrors] = useState<CreateFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Remembers the key for the last payload so a retry reuses it.
  const keyRef = useRef<{ signature: string; key: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const payload: CreatePayload = { description: description.trim(), amount: amount.trim(), currency };
    const localErrors = validateCreatePayload(payload);
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

  return {
    values: { description, amount, currency },
    setDescription,
    setAmount,
    setCurrency,
    errors,
    formError,
    submitting,
    submit,
  };
}
