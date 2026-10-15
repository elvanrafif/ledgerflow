/**
 * Centralized API client. Every request to the LedgerFlow API goes through
 * `apiFetch`, so credential handling, the error envelope, and session-expiry
 * redirects are defined in exactly one place.
 *
 * Contract (see apps/api):
 * - All endpoints live under `/api/v1`.
 * - Errors are returned as `{ error: { code, message, details? } }`.
 * - Money is a DECIMAL(18,2) serialized as a string; this client never parses it.
 */

export const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";

/** Endpoints where a 401 is an expected answer, not an expired session. */
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/me"];

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Sent as the `Idempotency-Key` header when present. */
  idempotencyKey?: string;
}

function baseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return (configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function isAuthEndpoint(path: string): boolean {
  return AUTH_ENDPOINTS.some((endpoint) => path === endpoint || path.startsWith(`${endpoint}/`));
}

/** Best-effort redirect to /login. Guarded so it is a no-op outside the browser. */
function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = "REQUEST_FAILED";
  let message = `Request failed with status ${response.status}`;
  let details: unknown;

  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    // Non-JSON body: keep the status-based defaults.
  }

  return new ApiError(response.status, code, message, details);
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { idempotencyKey, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };
  if (rest.body !== undefined && rest.body !== null && requestHeaders["content-type"] === undefined) {
    requestHeaders["content-type"] = "application/json";
  }
  if (idempotencyKey) {
    requestHeaders["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers: requestHeaders,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 && !isAuthEndpoint(path)) {
      redirectToLogin();
    }
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
