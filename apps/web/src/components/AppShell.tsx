"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { logout } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/transactions/new", label: "New transaction" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      /* Sign out is best-effort; the session cookie is cleared server-side. */
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--space-5)",
          background: "var(--surface-default)",
          borderBottom: "1px solid var(--border-default)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
          <Link
            href="/dashboard"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            LedgerFlow
          </Link>
          <nav aria-label="Primary" style={{ display: "flex", gap: "var(--space-4)" }}>
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--interactive-primary)" : "var(--text-secondary)",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Button variant="ghost" onClick={onSignOut} loading={signingOut}>
          Sign out
        </Button>
      </header>
      <main style={{ flex: 1, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "var(--space-6) var(--space-5)" }}>
        {children}
      </main>
    </div>
  );
}
