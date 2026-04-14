import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

async function handleLogout(request: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/", request.url));
}

export const GET = handleLogout;
export const POST = handleLogout;
