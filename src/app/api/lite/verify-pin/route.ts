import { NextRequest, NextResponse } from "next/server";
import { demoStore } from "@/lib/demo-store";
import { verifyPin } from "@/lib/crypto";
import { getServiceAccountClient, listFiles, readFileRaw } from "@/lib/drive/client";
import {
  checkSharedViewLimit,
  clearSharedViewFailures,
  recordSharedViewFailure,
} from "@/lib/rate-limit";
import { decodeShareToken, shareSecretsMatch } from "@/lib/share-token";
import type { MetadataFile, ShareManifestFile } from "@/lib/drive/schema";

const ACCESS_CODE_LENGTH = 8;
const LEGACY_PIN_LENGTH = 6;

function isValidAccessCode(pin: string): boolean {
  return (
    new RegExp(`^\\d{${ACCESS_CODE_LENGTH}}$`).test(pin) ||
    new RegExp(`^\\d{${LEGACY_PIN_LENGTH}}$`).test(pin)
  );
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isValidShare(manifest: ShareManifestFile | null, shareSecret: string): boolean {
  if (!manifest || manifest.version !== 1 || manifest.revoked_at) return false;
  return shareSecretsMatch(manifest.share_secret_hash, shareSecret);
}

/**
 * POST — Verify access code for shared view. Returns encrypted files + wrapped_dek + salt
 * so the client can unwrap the DEK and decrypt everything in the browser.
 * Body: { folderId: shareToken, pin }
 */
export async function POST(request: NextRequest) {
  const { folderId: shareToken, pin } = (await request.json()) as { folderId: string; pin: string };

  if (!shareToken || !pin) {
    return NextResponse.json({ error: "Missing share link or access code" }, { status: 400 });
  }

  if (!isValidAccessCode(pin)) {
    return NextResponse.json({ error: "Access code must be 6 or 8 digits" }, { status: 400 });
  }

  const limit = await checkSharedViewLimit(shareToken, request);
  if (limit.limited) {
    return NextResponse.json(
      {
        error: "Too many incorrect attempts. Please try again later.",
        valid: false,
      },
      {
        status: 429,
        headers: limit.retryAfterSeconds
          ? { "Retry-After": String(limit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  // Demo mode
  const sharePayload = decodeShareToken(shareToken);
  const isLegacyDemo = shareToken === "demo-local";
  if (!sharePayload && !isLegacyDemo) {
    return NextResponse.json({ error: "Invalid or expired share link", valid: false }, { status: 400 });
  }

  const folderId = sharePayload?.folderId || "demo-local";
  const shareSecret = sharePayload?.shareSecret || "";

  if (folderId === "demo-local") {
    const shareManifest = demoStore.get("_share.json") as ShareManifestFile | null;
    if (sharePayload && !isValidShare(shareManifest, shareSecret)) {
      return NextResponse.json({ error: "This share link is no longer valid", valid: false }, { status: 403 });
    }

    const meta = demoStore.get("_meta.json") as MetadataFile | null;
    if (!meta?.pin_check || !meta?.salt) {
      return NextResponse.json({ error: "No access code set" }, { status: 400 });
    }

    const valid = await verifyPin(pin, meta.salt, meta.pin_check);
    if (!valid) {
      await recordSharedViewFailure(shareToken, request);
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    await clearSharedViewFailures(shareToken, request);

    const all = demoStore.getAll();
    const encryptedFiles: Record<string, string> = {};
    for (const [key, val] of Object.entries(all)) {
      if (key !== "_meta" && typeof val === "string") {
        encryptedFiles[key] = val;
      }
    }

    return NextResponse.json({
      valid: true,
      salt: meta.salt,
      wrapped_dek: meta.wrapped_dek || null,
      files: encryptedFiles,
    });
  }

  try {
    const auth = getServiceAccountClient();
    const shareManifest = parseJson<ShareManifestFile>(
      await readFileRaw(auth, folderId, "_share.json")
    );
    if (!isValidShare(shareManifest, shareSecret)) {
      return NextResponse.json({ error: "This share link is no longer valid", valid: false }, { status: 403 });
    }

    const meta = parseJson<MetadataFile>(await readFileRaw(auth, folderId, "_meta.json"));
    if (!meta) {
      return NextResponse.json({ error: "No metadata found" }, { status: 400 });
    }

    if (!meta.pin_check || !meta.salt) {
      return NextResponse.json({ error: "No access code set" }, { status: 400 });
    }

    const valid = await verifyPin(pin, meta.salt, meta.pin_check);
    if (!valid) {
      await recordSharedViewFailure(shareToken, request);
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    await clearSharedViewFailures(shareToken, request);

    const encryptedFiles: Record<string, string> = {};
    const encFiles = (await listFiles(auth, folderId)).filter((file) => file.name.endsWith(".enc"));

    const downloads = await Promise.allSettled(
      encFiles.map(async (file) => {
        const content = await readFileRaw(auth, folderId, file.name);
        const key = file.name.replace(".enc", "");
        return { key, content };
      })
    );

    for (const result of downloads) {
      if (result.status === "fulfilled" && result.value.content) {
        encryptedFiles[result.value.key] = result.value.content;
      }
    }

    return NextResponse.json({
      valid: true,
      salt: meta.salt,
      wrapped_dek: meta.wrapped_dek || null,
      files: encryptedFiles,
    });
  } catch (err) {
    console.error("verify-pin error:", err);
    const message = err instanceof Error ? err.message : "Unable to verify";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
