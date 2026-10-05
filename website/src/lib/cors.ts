import { NextResponse } from "next/server";

/**
 * Permissive-but-safe CORS for the endpoints the Cnaz Foods mobile app calls.
 *
 * The mobile app is a native client (no CORS applies there); these headers
 * exist so the app can ALSO run in a browser context (Expo web). They are
 * safe because:
 * - credentials are NOT allowed (no cookies cross-origin),
 * - every protected endpoint authenticates via the caller's own Bearer token,
 * - the only data exposed without auth is the public catalogue and the public
 *   Supabase URL + anon key (identical to what any browser already receives).
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsJson(body: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
  });
}

/** Preflight response for browser clients. */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
