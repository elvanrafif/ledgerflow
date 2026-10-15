import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import LoginPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
}));

beforeEach(() => {
  push.mockReset();
  server.use(
    http.get("*/api/v1/auth/me", () =>
      HttpResponse.json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } }, { status: 401 }),
    ),
  );
});

describe("LoginPage", () => {
  it("redirects to /dashboard after successful login", async () => {
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json({ user: { id: "u1", name: "Ada", email: "ada@example.com" } }),
      ),
    );

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows an error when credentials are rejected", async () => {
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json(
          { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } },
          { status: 401 },
        ),
      ),
    );

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/i);
  });

  it("redirects an already-authenticated visitor away from /login", async () => {
    server.use(
      http.get("*/api/v1/auth/me", () =>
        HttpResponse.json({ user: { id: "u1", name: "Ada", email: "ada@example.com" } }),
      ),
    );

    render(<LoginPage />);
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("does not render a create account link", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("link", { name: /create an account/i })).toBeNull();
  });

  it("displays demo credentials in popover on hover and can auto-fill form", async () => {
    render(<LoginPage />);
    const infoButton = screen.getByRole("button", { name: /demo login information/i });
    expect(infoButton).toBeInTheDocument();

    await userEvent.hover(infoButton);
    expect(screen.getByText("ledgerflow.sample@example.test")).toBeInTheDocument();
    expect(screen.getByText("iniakundemo")).toBeInTheDocument();

    const fillButton = screen.getByRole("button", { name: /auto-fill to form/i });
    await userEvent.click(fillButton);

    expect(screen.getByLabelText(/email/i)).toHaveValue("ledgerflow.sample@example.test");
    expect(screen.getByLabelText(/password/i)).toHaveValue("iniakundemo");
  });
});
