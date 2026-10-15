import { apiFetch, ApiError } from "@/lib/api-client";

/** The public user shape the API returns from auth endpoints. */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface AuthResponse {
  user: User;
}

/** Validation failures from the API: `{ field: [messages] }`. */
export type FieldErrors = Record<string, string[]>;

export function register(input: { name: string; email: string; password: string }): Promise<User> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((response) => response.user);
}

export function login(input: { email: string; password: string }): Promise<User> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((response) => response.user);
}

export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

/**
 * The current user, or null when there is no valid session. A 401 here is an
 * expected answer (not an expired session), so it resolves to null instead of
 * throwing or redirecting.
 */
export async function currentUser(): Promise<User | null> {
  try {
    const response = await apiFetch<AuthResponse>("/auth/me");
    return response.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** Extract field-keyed validation errors from an ApiError, or null if none. */
export function fieldErrors(error: unknown): FieldErrors | null {
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.details) {
    return error.details as FieldErrors;
  }
  return null;
}
