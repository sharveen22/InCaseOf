import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/auth/google";
import crypto from "crypto";

const OAUTH_STATE_COOKIE = "incaseof_oauth_state";
const OAUTH_STATE_COOKIE_PATH = "/api/auth/callback";

export async function GET(request: NextRequest) {
  const state = crypto.randomBytes(32).toString("base64url");
  const forceConsent = request.nextUrl.searchParams.get("consent") === "1";
  const response = NextResponse.redirect(getAuthUrl(state, forceConsent));

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: OAUTH_STATE_COOKIE_PATH,
    maxAge: 10 * 60,
  });

  return response;
}
