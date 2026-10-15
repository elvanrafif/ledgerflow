import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "./Field";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";

describe("Field", () => {
  it("binds the label to the input so it can be found by label text", async () => {
    render(<Field label="Email" name="email" />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toBeInTheDocument();
  });

  it("announces a validation error and marks the input invalid", () => {
    render(<Field label="Email" error="Invalid email" />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
  });

  it("accepts an array of errors and shows the first", () => {
    render(<Field label="Email" error={["Invalid email", "Too long"]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
  });
});

describe("Button", () => {
  it("is reachable and activatable by keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /save/i })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables itself while loading and exposes a busy state", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders the requested variant", () => {
    render(<Button variant="primary">Create</Button>);
    expect(screen.getByRole("button", { name: /create/i })).toHaveAttribute("data-variant", "primary");
  });
});

describe("StatusBadge", () => {
  it("shows the status as readable text, not color alone", () => {
    render(<StatusBadge status="PENDING" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("carries the status in a data attribute for styling", () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText("completed")).toHaveAttribute("data-status", "COMPLETED");
  });
});

describe("state primitives", () => {
  it("EmptyState explains why it is empty and offers a next action", () => {
    render(
      <EmptyState title="No transactions yet" body="Create your first transaction to get started." action={<Button>New transaction</Button>} />,
    );
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new transaction/i })).toBeInTheDocument();
  });

  it("LoadingState announces that work is in progress", () => {
    render(<LoadingState label="Loading transactions" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();
  });

  it("ErrorState surfaces the message as an alert", () => {
    render(<ErrorState message="Could not load transactions" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load transactions");
  });
});
