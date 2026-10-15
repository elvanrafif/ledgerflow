import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import RegisterPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
}));

beforeEach(() => {
  push.mockReset();
  // Default: no active session, so the auth-page check resolves to null.
  server.use(
    http.get("*/api/v1/auth/me", () =>
      HttpResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } }, { status: 401 }),
    ),
  );
});

describe("RegisterPage", () => {
  it("shows field-level validation errors returned by the API", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
              details: { email: ["Invalid email"] },
            },
          },
          { status: 400 },
        ),
      ),
    );

    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/name/i), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText(/email/i), "bad");
    await userEvent.type(screen.getByLabelText(/password/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it("redirects to /dashboard after a successful registration", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () =>
        HttpResponse.json(
          { user: { id: "u1", name: "Ada", email: "ada@example.com" } },
          { status: 201 },
        ),
      ),
    );

    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/name/i), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("surfaces a non-field error (e.g. duplicate email) as a form error", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () =>
        HttpResponse.json(
          { error: { code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists" } },
          { status: 409 },
        ),
      ),
    );

    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/name/i), "Ada");
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("redirects an already-authenticated visitor away from /register", async () => {
    server.use(
      http.get("*/api/v1/auth/me", () =>
        HttpResponse.json({ user: { id: "u1", name: "Ada", email: "ada@example.com" } }),
      ),
    );

    render(<RegisterPage />);
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });
});
