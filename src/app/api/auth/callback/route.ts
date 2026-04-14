import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/auth/google";
import { setSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=no_code", request.url)
    );
  }

  try {
    const sessionData = await exchangeCode(code);
    await setSession(sessionData);
    return NextResponse.redirect(new URL("/lite", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
