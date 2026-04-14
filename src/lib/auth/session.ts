import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "incaseof_session";
const ALGORITHM = "aes-256-gcm";

function getSecret(): Buffer {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV !== "production" ? "dev-only-fallback-secret-not-for-prod" : "");
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return crypto.scryptSync(secret, "incaseof-salt", 32);
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
  name: string;
  picture?: string;
  drive_folder_id?: string;
  dek?: string; // Data Encryption Key (base64url), stored in encrypted cookie only
  pin?: string; // kept for backward compat during migration
  salt?: string; // kept for backward compat during migration
}

export function encryptSession(data: SessionData): string {
  const key = getSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv (12) + tag (16) + encrypted
  const result = Buffer.concat([iv, tag, encrypted]);
  return result.toString("base64url");
}

export function decryptSession(token: string): SessionData | null {
  try {
    const key = getSecret();
    const buf = Buffer.from(token, "base64url");

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return decryptSession(cookie.value);
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encryptSession(data);
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
