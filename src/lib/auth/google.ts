import { google } from "googleapis";
import type { SessionData } from "./session";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file",
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: SCOPES,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || "",
    expires_at: tokens.expiry_date || Date.now() + 3600 * 1000,
    email: profile.email!,
    name: profile.name || profile.email!,
    picture: profile.picture || undefined,
  } satisfies SessionData;
}

export function getAuthenticatedClient(session: SessionData) {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expiry_date: session.expires_at,
  });
  return client;
}

export async function refreshTokenIfNeeded(
  session: SessionData
): Promise<{ session: SessionData; refreshed: boolean }> {
  if (Date.now() < session.expires_at - 60_000) {
    return { session, refreshed: false };
  }

  const client = getAuthenticatedClient(session);
  const { credentials } = await client.refreshAccessToken();

  const updated: SessionData = {
    ...session,
    access_token: credentials.access_token || session.access_token,
    expires_at: credentials.expiry_date || Date.now() + 3600 * 1000,
  };

  return { session: updated, refreshed: true };
}
