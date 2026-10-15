import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

/**
 * Protected area layout (route group, so URLs stay /dashboard, /transactions,
 * /transactions/new, /transactions/[id]).
 *
 * Authorization is enforced by the API; this shell is presentation only (nav +
 * sign out). A 401 from any API call redirects to /login via the API client.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
