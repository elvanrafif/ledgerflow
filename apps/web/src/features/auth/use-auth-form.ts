"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fieldErrors, type FieldErrors } from "@/lib/auth";

/**
 * Shared behavior for the auth forms (login, register).
 *
 * Client-side validation here is presence-only: format rules (email shape,
 * password length) belong to the API, so its field errors are what the user
 * sees. API `details` map back onto the fields via `fieldErrors`.
 *
 * The caller supplies the field set, a presence check, and the submit action.
 */
export function useAuthForm<T extends Record<string, string>>(options: {
  initial: T;
  /** Presence-only validation; format/length rules are the API's job. */
  validate: (values: T) => FieldErrors;
  submit: (values: T) => Promise<unknown>;
  onSuccess: () => string; // returns the path to navigate to
  fallbackError: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<T>(options.initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof T, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const localErrors = options.validate(values);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      // The submit action trims the fields it should (never the password).
      await options.submit(values);
      router.push(options.onSuccess());
    } catch (error) {
      const details = fieldErrors(error);
      if (details) setErrors(details);
      else setFormError(error instanceof ApiError ? error.message : options.fallbackError);
    } finally {
      setSubmitting(false);
    }
  }

  return { values, errors, formError, submitting, update, onSubmit };
}
