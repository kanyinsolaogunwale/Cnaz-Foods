import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed, self-contained tokens for the email-confirmed account deletion
 * flow. SERVER ONLY — the signing key is derived from the Supabase service
 * role key, which must never leave the server.
 *
 * Why a signed token instead of a database table? It needs no schema changes,
 * it cannot be forged without the service role key, and it expires on its
 * own, so an ignored deletion request simply lapses after 60 minutes.
 */

const TOKEN_VERSION = "v1";
const TOKEN_TTL_MINUTES = 60;

export const DELETE_LINK_TTL_MINUTES = TOKEN_TTL_MINUTES;

type DeleteTokenPayload = {
  uid: string;
  iat: number;
  exp: number;
};

function signingKey(): string {
  return `cnaz-delete-link:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-only"}`;
}

function sign(body: string): string {
  return createHmac("sha256", signingKey()).update(body).digest("base64url");
}

/** Creates a signed deletion token for an auth user (valid for 60 minutes). */
export function createDeleteToken(uid: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: DeleteTokenPayload = { uid, iat: now, exp: now + TOKEN_TTL_MINUTES * 60 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${TOKEN_VERSION}.${body}.${sign(body)}`;
}

export type VerifiedDeleteToken =
  | { valid: true; uid: string }
  | { valid: false; reason: "malformed" | "bad-signature" | "expired" };

/** Verifies a deletion token's signature, structure and expiry. */
export function verifyDeleteToken(token: string | null | undefined): VerifiedDeleteToken {
  if (!token) return { valid: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return { valid: false, reason: "malformed" };
  }

  const [, body, signature] = parts;
  const expected = Buffer.from(sign(body));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { valid: false, reason: "bad-signature" };
  }

  let payload: DeleteTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DeleteTokenPayload;
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (
    typeof payload?.uid !== "string" ||
    payload.uid.length === 0 ||
    typeof payload?.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    return { valid: false, reason: "malformed" };
  }

  if (payload.exp * 1000 <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, uid: payload.uid };
}
