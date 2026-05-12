import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/auth/csrf";
import { setSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  await setSession({
    access_token: "demo-token",
    refresh_token: "demo-refresh",
    expires_at: Date.now() + 1000 * 60 * 60 * 24 * 365,
    email: "demo@incaseof.test",
    name: "Demo User",
    drive_folder_id: "demo-local",
  });

  return NextResponse.json({ ok: true });
}
