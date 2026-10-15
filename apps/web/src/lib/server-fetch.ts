import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_API_BASE_URL, ApiError } from "./api-client";

/**
 * Server-side API fetch. Server Components run on the server, where the
 * browser's cookies are not attached automatically, so we forward the incoming
 * session cookie explicitly (the API authenticates by cookie, PRD §8).
 *
 * Client Components must use `apiFetch` instead; this module is server-only.
 */

function serverBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export async function serverFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(`${serverBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    // Dashboard and list views must reflect the latest write, never a cache.
    cache: "no-store",
  });

  if (!response.ok) {
    let code = "REQUEST_FAILED";
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      /* keep defaults */
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
