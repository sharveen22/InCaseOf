import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/auth/csrf";
import { getSession, setSession } from "@/lib/auth/session";
import { getAuthenticatedClient, refreshTokenIfNeeded } from "@/lib/auth/google";
import { createIncaseFolder, readFileRaw, writeFileRaw } from "@/lib/drive/client";
import {
  generateSalt,
  generatePinCheck,
  verifyPin,
  generateDEK,
  wrapDEK,
  unwrapDEK,
  wrapDEKForRecovery,
  unwrapDEKForRecovery,
} from "@/lib/crypto";
import { demoStore } from "@/lib/demo-store";
import type { MetadataFile } from "@/lib/drive/schema";

const ACCESS_CODE_LENGTH = 8;
const LEGACY_PIN_LENGTH = 6;

function isNumericCode(pin: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(pin);
}

type PinAction = "setup" | "unlock" | "reset" | "owner_unlock";

function isValidCodeForAction(pin: string, action: PinAction): boolean {
  if (action === "unlock") {
    return isNumericCode(pin, ACCESS_CODE_LENGTH) || isNumericCode(pin, LEGACY_PIN_LENGTH);
  }
  return isNumericCode(pin, ACCESS_CODE_LENGTH);
}

function isInsufficientScopeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.toLowerCase().includes("insufficient authentication scopes");
}

/**
 * GET — Check if a PIN has been set
 */
export async function GET() {
  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Already unlocked in this session?
  if (sessionData.dek) {
    return NextResponse.json({ has_pin: true, unlocked: true });
  }

  // Demo mode
  if (sessionData.drive_folder_id === "demo-local") {
    const meta = demoStore.get("_meta.json") as MetadataFile | null;
    return NextResponse.json({
      has_pin: !!meta?.pin_check,
      unlocked: false,
    });
  }

  // Production: check Drive for _meta.json
  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);

  if (!session.drive_folder_id) {
    const folderId = await createIncaseFolder(auth);
    session.drive_folder_id = folderId;
    await setSession(session);
  }

  const metaRaw = await readFileRaw(auth, session.drive_folder_id!, "_meta.json");
  if (!metaRaw) {
    return NextResponse.json({ has_pin: false, unlocked: false });
  }

  try {
    const meta = JSON.parse(metaRaw) as MetadataFile;
    return NextResponse.json({
      has_pin: !!meta.pin_check,
      unlocked: false,
    });
  } catch {
    return NextResponse.json({ has_pin: false, unlocked: false });
  }
}

/**
 * POST — Set a new access code, verify an existing code, reset code, or unlock for the owner
 * Body: { pin?: string, action: "setup" | "unlock" | "reset" | "owner_unlock" }
 */
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { pin, action } = (await request.json()) as {
    pin?: string;
    action: PinAction;
  };

  if (!["setup", "unlock", "reset", "owner_unlock"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action !== "owner_unlock" && (!pin || !isValidCodeForAction(pin, action))) {
    const message =
      action === "unlock"
        ? "Access code must be 6 or 8 digits"
        : "Access code must be 8 digits";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // --- SETUP: Create new PIN + DEK ---
  if (action === "setup") {
    const newPin = pin!;
    const salt = generateSalt();
    const pinCheck = await generatePinCheck(newPin, salt);
    const dek = generateDEK();
    const wrappedDEK = await wrapDEK(dek, newPin, salt);
    const recoveryDEK = await wrapDEKForRecovery(dek, sessionData.email);

    const metadata: MetadataFile = {
      salt,
      pin_check: pinCheck,
      wrapped_dek: wrappedDEK,
      recovery_dek: recoveryDEK,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_steps: [],
      version: 2,
    };

    try {
      if (sessionData.drive_folder_id === "demo-local") {
        demoStore.set("_meta.json", metadata);
      } else {
        const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
        if (refreshed) await setSession(session);

        const auth = getAuthenticatedClient(session);

        if (!session.drive_folder_id) {
          const folderId = await createIncaseFolder(auth);
          session.drive_folder_id = folderId;
          await setSession(session);
        }

        await writeFileRaw(
          auth,
          session.drive_folder_id!,
          "_meta.json",
          JSON.stringify(metadata, null, 2)
        );
        sessionData.drive_folder_id = session.drive_folder_id;
      }
    } catch (err) {
      if (isInsufficientScopeError(err)) {
        return NextResponse.json(
          {
            error: "Google Drive permission needs to be refreshed",
            code: "reauth_required",
          },
          { status: 403 }
        );
      }
      throw err;
    }

    // Store DEK in session
    sessionData.dek = dek;
    sessionData.pin = undefined;
    sessionData.salt = undefined;
    await setSession(sessionData);

    return NextResponse.json({ success: true });
  }

  // --- UNLOCK: Verify PIN and unwrap DEK ---
  if (action === "unlock") {
    const unlockPin = pin!;
    let meta: MetadataFile | null = null;

    if (sessionData.drive_folder_id === "demo-local") {
      meta = demoStore.get("_meta.json") as MetadataFile | null;
    } else {
      const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
      if (refreshed) await setSession(session);

      const auth = getAuthenticatedClient(session);

      if (!session.drive_folder_id) {
        return NextResponse.json({ error: "No folder found" }, { status: 400 });
      }

      const metaRaw = await readFileRaw(auth, session.drive_folder_id!, "_meta.json");
      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch {
          /* ignore */
        }
      }
    }

    if (!meta?.pin_check || !meta?.salt) {
      return NextResponse.json({ error: "No access code set" }, { status: 400 });
    }

    const valid = await verifyPin(unlockPin, meta.salt, meta.pin_check);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect access code", valid: false }, { status: 401 });
    }

    // Unwrap DEK with PIN
    let dek: string;
    if (meta.wrapped_dek) {
      // v2: DEK layer
      dek = await unwrapDEK(meta.wrapped_dek, unlockPin, meta.salt);
    } else {
      // v1 legacy: migrate all data to DEK-based encryption
      const { encryptWithDEK, wrapDEKForRecovery } = await import("@/lib/crypto");
      dek = generateDEK();

      // Helper to decrypt v1 data (PIN+salt based)
      async function v1Decrypt(encoded: string): Promise<ArrayBuffer> {
        const pinKey = await (async () => {
          const enc = new TextEncoder();
          const km = await crypto.subtle.importKey("raw", enc.encode(unlockPin), "PBKDF2", false, ["deriveKey"]);
          return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: enc.encode(meta!.salt), iterations: 100000, hash: "SHA-256" },
            km,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
          );
        })();
        // base64url decode
        const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const iv = bytes.slice(0, 12);
        const ct = bytes.slice(12);
        return crypto.subtle.decrypt({ name: "AES-GCM", iv }, pinKey, ct);
      }

      // Re-encrypt all .enc files with DEK
      if (sessionData.drive_folder_id === "demo-local") {
        const all = demoStore.getAll();
        for (const [key, val] of Object.entries(all)) {
          if (key !== "_meta" && typeof val === "string") {
            try {
              const plain = await v1Decrypt(val);
              const reEncrypted = await encryptWithDEK(plain, dek);
              demoStore.set(key.endsWith(".enc") ? key : `${key}.enc`, reEncrypted);
            } catch { /* skip unreadable */ }
          }
        }
      } else {
        const { readAllFiles: listAllFiles, writeEncrypted: writeEnc } = await import("@/lib/drive/client");
        const { session: s2, refreshed: r2 } = await refreshTokenIfNeeded(sessionData);
        if (r2) await setSession(s2);
        const auth2 = getAuthenticatedClient(s2);
        const fid = s2.drive_folder_id!;
        const allRaw = await listAllFiles(auth2, fid);
        for (const [key, val] of Object.entries(allRaw)) {
          if (key !== "_meta" && typeof val === "string") {
            try {
              const plain = await v1Decrypt(val);
              const reEncrypted = await encryptWithDEK(plain, dek);
              await writeEnc(auth2, fid, `${key}.enc`, reEncrypted);
            } catch { /* skip */ }
          }
        }
      }

      // Update _meta.json to v2
      const wrappedDEK = await wrapDEK(dek, unlockPin, meta.salt);
      const recoveryDEK = await wrapDEKForRecovery(dek, sessionData.email);
      meta.wrapped_dek = wrappedDEK;
      meta.recovery_dek = recoveryDEK;
      meta.version = 2;
      meta.updated_at = new Date().toISOString();

      if (sessionData.drive_folder_id === "demo-local") {
        demoStore.set("_meta.json", meta);
      } else {
        const { session: s3, refreshed: r3 } = await refreshTokenIfNeeded(sessionData);
        if (r3) await setSession(s3);
        const auth3 = getAuthenticatedClient(s3);
        await writeFileRaw(auth3, s3.drive_folder_id!, "_meta.json", JSON.stringify(meta, null, 2));
      }
    }

    sessionData.dek = dek;
    await setSession(sessionData);

    return NextResponse.json({ success: true, valid: true });
  }

  // --- OWNER UNLOCK: Google-authenticated owner opens the kit via recovery-wrapped DEK ---
  if (action === "owner_unlock") {
    let meta: MetadataFile | null = null;
    let currentSession = { ...sessionData };

    if (currentSession.drive_folder_id === "demo-local") {
      meta = demoStore.get("_meta.json") as MetadataFile | null;
    } else {
      const { session, refreshed } = await refreshTokenIfNeeded(currentSession);
      if (refreshed) {
        currentSession = session;
        await setSession(currentSession);
      }

      const auth = getAuthenticatedClient(currentSession);

      if (!currentSession.drive_folder_id) {
        return NextResponse.json({ error: "No folder found" }, { status: 400 });
      }

      const metaRaw = await readFileRaw(auth, currentSession.drive_folder_id!, "_meta.json");
      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch {
          /* ignore */
        }
      }
    }

    if (!meta?.pin_check || !meta?.salt) {
      return NextResponse.json({ error: "No emergency access code set" }, { status: 400 });
    }

    if (!meta.recovery_dek) {
      return NextResponse.json(
        {
          error: "Enter your emergency access code once to upgrade this kit.",
          code: "access_code_required",
        },
        { status: 409 }
      );
    }

    const dek = await unwrapDEKForRecovery(meta.recovery_dek, currentSession.email);
    currentSession.dek = dek;
    currentSession.pin = undefined;
    currentSession.salt = undefined;
    await setSession(currentSession);

    return NextResponse.json({ success: true });
  }

  // --- RESET: Recover DEK via server key, re-wrap with new PIN ---
  if (action === "reset") {
    const newPin = pin!;
    let meta: MetadataFile | null = null;

    // Use a single session reference that stays up-to-date across refreshes
    let currentSession = { ...sessionData };

    if (currentSession.drive_folder_id === "demo-local") {
      meta = demoStore.get("_meta.json") as MetadataFile | null;
    } else {
      const { session, refreshed } = await refreshTokenIfNeeded(currentSession);
      if (refreshed) {
        currentSession = session;
        await setSession(currentSession);
      }

      const auth = getAuthenticatedClient(currentSession);

      if (!currentSession.drive_folder_id) {
        return NextResponse.json({ error: "No folder found" }, { status: 400 });
      }

      const metaRaw = await readFileRaw(auth, currentSession.drive_folder_id!, "_meta.json");
      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch {
          /* ignore */
        }
      }
    }

    // Recover the DEK
    let dek: string;
    if (meta?.recovery_dek) {
      dek = await unwrapDEKForRecovery(meta.recovery_dek, currentSession.email);
    } else {
      // No recovery key (v1 data). Unfortunately we have to start fresh.
      dek = generateDEK();
      // Clear old encrypted data since we can't decrypt it
      if (currentSession.drive_folder_id === "demo-local") {
        demoStore.clear();
      } else {
        const { session, refreshed } = await refreshTokenIfNeeded(currentSession);
        if (refreshed) {
          currentSession = session;
          await setSession(currentSession);
        }
        const auth = getAuthenticatedClient(currentSession);
        const { listFiles, deleteFile } = await import("@/lib/drive/client");
        const files = await listFiles(auth, currentSession.drive_folder_id!);
        for (const file of files) {
          if (file.name && file.name !== "_meta.json") {
            await deleteFile(auth, currentSession.drive_folder_id!, file.name);
          }
        }
      }
    }

    // Create new PIN wrapping
    const salt = generateSalt();
    const pinCheck = await generatePinCheck(newPin, salt);
    const wrappedDEK = await wrapDEK(dek, newPin, salt);
    const recoveryDEK = await wrapDEKForRecovery(dek, currentSession.email);

    const metadata: MetadataFile = {
      salt,
      pin_check: pinCheck,
      wrapped_dek: wrappedDEK,
      recovery_dek: recoveryDEK,
      created_at: meta?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_steps: meta?.recovery_dek ? meta.completed_steps || [] : [],
      version: 2,
    };

    if (currentSession.drive_folder_id === "demo-local") {
      demoStore.set("_meta.json", metadata);
    } else {
      const { session, refreshed } = await refreshTokenIfNeeded(currentSession);
      if (refreshed) {
        currentSession = session;
        await setSession(currentSession);
      }
      const auth = getAuthenticatedClient(currentSession);
      await writeFileRaw(
        auth,
        currentSession.drive_folder_id!,
        "_meta.json",
        JSON.stringify(metadata, null, 2)
      );
    }

    currentSession.dek = dek;
    currentSession.pin = undefined;
    currentSession.salt = undefined;
    await setSession(currentSession);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
