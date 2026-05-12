import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/auth/google";
import { setSession } from "@/lib/auth/session";
import crypto from "crypto";

const OAUTH_STATE_COOKIE = "incaseof_oauth_state";
const OAUTH_STATE_COOKIE_PATH = "/api/auth/callback";

function clearOAuthState(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: OAUTH_STATE_COOKIE_PATH,
    maxAge: 0,
  });
}

function redirectWithClearedState(url: URL) {
  const response = NextResponse.redirect(url);
  clearOAuthState(response);
  return response;
}

function statesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code) {
    return redirectWithClearedState(
      new URL("/?error=no_code", request.url)
    );
  }

  if (!state || !storedState || !statesMatch(storedState, state)) {
    return redirectWithClearedState(
      new URL("/?error=invalid_state", request.url)
    );
  }

  try {
    const sessionData = await exchangeCode(code);
    await setSession(sessionData);
    const response = NextResponse.redirect(new URL("/lite", request.url));
    clearOAuthState(response);
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    if (err instanceof Error && err.message === "missing_required_drive_scope") {
      return redirectWithClearedState(
        new URL("/?error=missing_drive_scope", request.url)
      );
    }
    return redirectWithClearedState(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
