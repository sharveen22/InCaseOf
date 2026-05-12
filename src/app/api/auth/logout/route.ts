import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/auth/csrf";
import { clearSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/", request.url));
}
