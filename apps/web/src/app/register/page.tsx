"use client";

import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { register, type FieldErrors } from "@/lib/auth";
import { useAuthForm } from "@/features/auth/use-auth-form";
import { useRedirectIfAuthenticated } from "@/lib/use-redirect-if-authenticated";

/**
 * Presence-only validation. Format rules (email shape, password length) are the
 * API's to enforce, so its field errors are what the user sees (PRD §8).
 */
function validate(values: { name: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = ["Name is required"];
  if (!values.email.trim()) errors.email = ["Email is required"];
  if (!values.password) errors.password = ["Password is required"];
  return errors;
}

export default function RegisterPage() {
  useRedirectIfAuthenticated();
  const form = useAuthForm({
    initial: { name: "", email: "", password: "" },
    validate,
    submit: (values) => register({ name: values.name.trim(), email: values.email.trim(), password: values.password }),
    onSuccess: () => "/dashboard",
    fallbackError: "Could not create your account",
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start recording transactions in minutes."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={form.onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {form.formError ? <ErrorState message={form.formError} /> : null}
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          value={form.values.name}
          error={form.errors.name}
          onChange={(event) => form.update("name", event.target.value)}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          error={form.errors.email}
          onChange={(event) => form.update("email", event.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 12 characters."
          value={form.values.password}
          error={form.errors.password}
          onChange={(event) => form.update("password", event.target.value)}
        />
        <Button type="submit" variant="primary" loading={form.submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
