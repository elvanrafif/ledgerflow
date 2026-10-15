"use client";

import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { ErrorState } from "@/components/ErrorState";
import { DemoCredentialsPopover } from "@/components/DemoCredentialsPopover";
import { login, type FieldErrors } from "@/lib/auth";
import { useAuthForm } from "@/features/auth/use-auth-form";
import { useRedirectIfAuthenticated } from "@/lib/use-redirect-if-authenticated";

function validate(values: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email.trim()) errors.email = ["Email is required"];
  if (!values.password) errors.password = ["Password is required"];
  return errors;
}

export default function LoginPage() {
  useRedirectIfAuthenticated();
  const form = useAuthForm({
    initial: { email: "", password: "" },
    validate,
    submit: (values) => login({ email: values.email.trim(), password: values.password }),
    onSuccess: () => "/dashboard",
    fallbackError: "Could not sign you in",
  });

  return (
    <AuthShell
      title="Sign in"
      headerAction={
        <DemoCredentialsPopover
          onFill={(email, password) => {
            form.update("email", email);
            form.update("password", password);
          }}
        />
      }
    >
      <form onSubmit={form.onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {form.formError ? <ErrorState message={form.formError} /> : null}
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
          autoComplete="current-password"
          value={form.values.password}
          error={form.errors.password}
          onChange={(event) => form.update("password", event.target.value)}
        />
        <Button type="submit" variant="primary" loading={form.submitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
