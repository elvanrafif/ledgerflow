/**
 * Idempotency key lifecycle for the create-transaction form.
 *
 * Rule (plan Task 6, PRD FR-03): one key per payload. A retry of the *same*
 * payload reuses the key so the API replays instead of creating a duplicate; the
 * key is regenerated only when the payload actually changes.
 *
 * Implemented as a tiny deterministic module (no crypto import) so it is easy to
 * reason about and test. The key needs to be unique per submit attempt across
 * clients, not cryptographically secret.
 */

export interface CreatePayload {
  description: string;
  amount: string;
  currency: string;
}

/** A stable signature of the fields that define "the same transaction". */
export function payloadSignature(payload: CreatePayload): string {
  return `${payload.description}\u0000${payload.amount}\u0000${payload.currency}`;
}

let counter = 0;

/** A fresh idempotency key. Random enough to be unique per submit. */
export function newIdempotencyKey(): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `txn-${Date.now().toString(36)}-${counter}-${random}`;
}

/**
 * Returns the key to use for this payload. If the payload is unchanged from the
 * last one, the previous key is reused; otherwise a new key is issued.
 */
export function keyForPayload(
  previous: { signature: string; key: string } | null,
  payload: CreatePayload,
): { signature: string; key: string } {
  const signature = payloadSignature(payload);
  if (previous && previous.signature === signature) return previous;
  return { signature, key: newIdempotencyKey() };
}
