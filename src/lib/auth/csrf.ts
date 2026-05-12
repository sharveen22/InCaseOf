import { NextRequest, NextResponse } from "next/server";

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");

  // Same-origin fetches from older clients may omit Origin. Browser cross-origin
  // form/fetch requests include it, which is the CSRF case we need to block.
  if (!origin) return null;

  const requestOrigin = normalizeOrigin(request.url);
  const headerOrigin = normalizeOrigin(origin);

  if (!requestOrigin || !headerOrigin || requestOrigin !== headerOrigin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}
