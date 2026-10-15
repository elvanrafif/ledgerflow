"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { ApiError } from "@/lib/api-client";
import { fieldErrors, login, type FieldErrors } from "@/lib/auth";
import { useRedirectIfAuthenticated } from "@/lib/use-redirect-if-authenticated";

function validate(values: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email.trim()) errors.email = ["Email is required"];
  if (!values.password) errors.password = ["Password is required"];
  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  useRedirectIfAuthenticated();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const localErrors = validate(values);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      router.push("/dashboard");
    } catch (error) {
      const details = fieldErrors(error);
      if (details) {
        setErrors(details);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Could not sign you in");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          New to LedgerFlow? <Link href="/register">Create an account</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {formError ? <ErrorState message={formError} /> : null}
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(event) => update("email", event.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(event) => update("password", event.target.value)}
        />
        <Button type="submit" variant="primary" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
