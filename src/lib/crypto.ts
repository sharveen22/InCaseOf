// PIN-based AES-256-GCM encryption with DEK (Data Encryption Key) layer
// Works in both Node.js (API routes) and browser (share view)

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const PIN_CHECK_PLAINTEXT = "INCASEOF_PIN_VALID";

// ── Helpers ──

function bufferToBase64url(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Salt & Key Derivation ──

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveKey(pin: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── DEK (Data Encryption Key) ──

/**
 * Generate a random DEK (32 bytes, base64url encoded)
 */
export function generateDEK(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bufferToBase64url(bytes);
}

/**
 * Import a base64url DEK string as a CryptoKey
 */
async function importDEK(dek: string): Promise<CryptoKey> {
  const raw = base64urlToBuffer(dek);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Wrap (encrypt) a DEK with a PIN-derived key
 */
export async function wrapDEK(
  dek: string,
  pin: string,
  salt: string
): Promise<string> {
  const wrapKey = await deriveKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const dekBytes = base64urlToBuffer(dek);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    wrapKey,
    dekBytes.buffer as ArrayBuffer
  );

  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return bufferToBase64url(combined);
}

/**
 * Unwrap (decrypt) a DEK with a PIN-derived key
 */
export async function unwrapDEK(
  wrapped: string,
  pin: string,
  salt: string
): Promise<string> {
  const wrapKey = await deriveKey(pin, salt);
  const combined = base64urlToBuffer(wrapped);

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const dekBytes = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    wrapKey,
    ciphertext
  );

  return bufferToBase64url(new Uint8Array(dekBytes));
}

// ── Recovery key (server-side only) ──

/**
 * Wrap DEK with a recovery key derived from email + server secret.
 * Only callable on the server where SESSION_SECRET is available.
 */
export async function wrapDEKForRecovery(
  dek: string,
  email: string
): Promise<string> {
  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-only-fallback-secret-not-for-prod"
      : "");
  // Use email + secret as a deterministic "PIN" with a fixed salt for recovery
  const recoverySalt = "incaseof-recovery-v1";
  const recoveryPin = secret + ":" + email;
  return wrapDEK(dek, recoveryPin, recoverySalt);
}

/**
 * Unwrap DEK using the recovery key
 */
export async function unwrapDEKForRecovery(
  wrapped: string,
  email: string
): Promise<string> {
  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-only-fallback-secret-not-for-prod"
      : "");
  const recoverySalt = "incaseof-recovery-v1";
  const recoveryPin = secret + ":" + email;
  return unwrapDEK(wrapped, recoveryPin, recoverySalt);
}

// ── Encrypt / Decrypt with DEK ──

/**
 * Encrypt data using a DEK (base64url string)
 */
export async function encryptWithDEK(
  data: string | ArrayBuffer,
  dek: string
): Promise<string> {
  const key = await importDEK(dek);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const plaintext =
    typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    plaintext
  );

  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return bufferToBase64url(combined);
}

/**
 * Decrypt data using a DEK (base64url string)
 */
export async function decryptWithDEK(
  encoded: string,
  dek: string
): Promise<ArrayBuffer> {
  const key = await importDEK(dek);
  const combined = base64urlToBuffer(encoded);

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  return crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
}

export async function decryptWithDEKToString(
  encoded: string,
  dek: string
): Promise<string> {
  const buffer = await decryptWithDEK(encoded, dek);
  return new TextDecoder().decode(buffer);
}

export async function encryptJSONWithDEK(
  data: unknown,
  dek: string
): Promise<string> {
  return encryptWithDEK(JSON.stringify(data), dek);
}

export async function decryptJSONWithDEK<T = unknown>(
  encoded: string,
  dek: string
): Promise<T> {
  const str = await decryptWithDEKToString(encoded, dek);
  return JSON.parse(str) as T;
}

// ── PIN verification (unchanged) ──

export async function generatePinCheck(
  pin: string,
  salt: string
): Promise<string> {
  const key = await deriveKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(PIN_CHECK_PLAINTEXT);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);

  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return bufferToBase64url(combined);
}

export async function verifyPin(
  pin: string,
  salt: string,
  pinCheck: string
): Promise<boolean> {
  try {
    const key = await deriveKey(pin, salt);
    const combined = base64urlToBuffer(pinCheck);
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted) === PIN_CHECK_PLAINTEXT;
  } catch {
    return false;
  }
}

// ── Legacy functions (for share view client-side where only PIN+salt available) ──

/**
 * Decrypt using PIN + salt directly (used in share view where DEK is unwrapped client-side)
 */
export async function decryptJSON<T = unknown>(
  encoded: string,
  pin: string,
  salt: string
): Promise<T> {
  const key = await deriveKey(pin, salt);
  const combined = base64urlToBuffer(encoded);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const buffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}
