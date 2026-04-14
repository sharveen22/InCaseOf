import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";

export async function POST() {
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
