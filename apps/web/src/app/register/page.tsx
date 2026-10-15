"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { ApiError } from "@/lib/api-client";
import { fieldErrors, register, type FieldErrors } from "@/lib/auth";
import { useRedirectIfAuthenticated } from "@/lib/use-redirect-if-authenticated";

/**
 * Client-side checks are for feedback only. Only presence is checked here; format
 * rules (email shape, password length) are the API's to enforce, so the API's own
 * field errors are what the user sees (PRD §8).
 */
function validate(values: { name: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = ["Name is required"];
  if (!values.email.trim()) errors.email = ["Email is required"];
  if (!values.password) errors.password = ["Password is required"];
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  useRedirectIfAuthenticated();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
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
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      router.push("/dashboard");
    } catch (error) {
      const details = fieldErrors(error);
      if (details) {
        setErrors(details);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Could not create your account");
      }
    } finally {
      setSubmitting(false);
    }
  }

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
      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {formError ? <ErrorState message={formError} /> : null}
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={(event) => update("name", event.target.value)}
        />
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
          autoComplete="new-password"
          hint="At least 12 characters."
          value={values.password}
          error={errors.password}
          onChange={(event) => update("password", event.target.value)}
        />
        <Button type="submit" variant="primary" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
