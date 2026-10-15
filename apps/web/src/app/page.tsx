"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/auth";

/**
 * Root route: send visitors to the dashboard when signed in, otherwise to login.
 * The session check resolves, not throws, on a missing session.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    currentUser()
      .then((user) => {
        if (active) router.replace(user ? "/dashboard" : "/login");
      })
      .catch(() => {
        if (active) router.replace("/login");
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <span className="spinner" aria-label="Loading" role="status" />
    </main>
  );
}
