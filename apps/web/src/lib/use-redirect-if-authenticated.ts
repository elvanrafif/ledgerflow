"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/auth";

/**
 * Redirects an already-authenticated visitor away from an auth page to
 * /dashboard. Runs once on mount; a 401 (no session) is the expected answer and
 * leaves the visitor on the page. Failures are swallowed so a hiccup in the
 * check never blocks signing in.
 */
export function useRedirectIfAuthenticated(): void {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    currentUser()
      .then((user) => {
        if (active && user) router.replace("/dashboard");
      })
      .catch(() => {
        /* Not fatal: leave the visitor on the auth page. */
      });
    return () => {
      active = false;
    };
  }, [router]);
}
