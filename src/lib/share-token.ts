import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const TOKEN_VERSION = 1;

export interface ShareTokenPayload {
  version: number;
  folderId: string;
  shareSecret: string;
}

function getTokenKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-only-fallback-secret-not-for-prod" : "");
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return crypto.scryptSync(secret, "incaseof-share-token-v1", 32);
}

export function createShareSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashShareSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("base64url");
}

export function shareSecretsMatch(expectedHash: string, secret: string): boolean {
  const actualHash = hashShareSecret(secret);
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function encodeShareToken(folderId: string, shareSecret: string): string {
  const key = getTokenKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const payload: ShareTokenPayload = {
    version: TOKEN_VERSION,
    folderId,
    shareSecret,
  };

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decodeShareToken(token: string): ShareTokenPayload | null {
  try {
    const key = getTokenKey();
    const buffer = Buffer.from(token, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const payload = JSON.parse(decrypted.toString("utf8")) as ShareTokenPayload;
    if (
      payload.version !== TOKEN_VERSION ||
      typeof payload.folderId !== "string" ||
      typeof payload.shareSecret !== "string"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
