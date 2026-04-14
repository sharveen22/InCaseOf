import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth/session";
import { getAuthenticatedClient, refreshTokenIfNeeded } from "@/lib/auth/google";
import {
  createIncaseFolder,
  writeEncrypted,
  writeFileRaw,
  readFileRaw,
  readAllFiles,
} from "@/lib/drive/client";
import { encryptJSONWithDEK, decryptJSONWithDEK } from "@/lib/crypto";
import { demoStore } from "@/lib/demo-store";
import type { MetadataFile } from "@/lib/drive/schema";

function isDemo(session: { drive_folder_id?: string }) {
  return session.drive_folder_id === "demo-local";
}

function getDEK(session: { dek?: string; pin?: string; salt?: string }): string | null {
  return session.dek || null;
}

export async function GET(request: NextRequest) {
  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dek = getDEK(sessionData);
  if (!dek) {
    return NextResponse.json({ error: "PIN not set" }, { status: 403 });
  }

  const file = request.nextUrl.searchParams.get("file");

  // Demo mode
  if (isDemo(sessionData)) {
    if (file === "_all") {
      const all = demoStore.getAll();
      const decrypted: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(all)) {
        if (key === "_meta") {
          decrypted[key] = val;
        } else if (typeof val === "string") {
          try {
            decrypted[key] = await decryptJSONWithDEK(val, dek);
          } catch {
            decrypted[key] = {};
          }
        } else {
          decrypted[key] = val;
        }
      }
      return NextResponse.json(decrypted);
    }
    if (file === "_meta") {
      return NextResponse.json(demoStore.get("_meta.json") || {});
    }
    if (file) {
      const enc = demoStore.get(`${file}.enc`);
      if (!enc || typeof enc !== "string") return NextResponse.json({});
      try {
        const data = await decryptJSONWithDEK(enc, dek);
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({});
      }
    }
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
  }

  // Production: Google Drive
  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);

  if (!session.drive_folder_id) {
    const folderId = await createIncaseFolder(auth);
    session.drive_folder_id = folderId;
    await setSession(session);
  }
  const folderId = session.drive_folder_id!;

  if (file === "_all") {
    const allRaw = await readAllFiles(auth, folderId);
    const decrypted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(allRaw)) {
      if (key === "_meta") {
        try {
          decrypted[key] = JSON.parse(val);
        } catch {
          decrypted[key] = {};
        }
      } else if (typeof val === "string") {
        try {
          decrypted[key] = await decryptJSONWithDEK(val, dek);
        } catch {
          decrypted[key] = {};
        }
      }
    }
    return NextResponse.json(decrypted);
  }

  if (file === "_meta") {
    const raw = await readFileRaw(auth, folderId, "_meta.json");
    if (!raw) return NextResponse.json({});
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({});
    }
  }

  if (file) {
    const raw = await readFileRaw(auth, folderId, `${file}.enc`);
    if (!raw) return NextResponse.json({});
    try {
      const data = await decryptJSONWithDEK(raw, dek);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({});
    }
  }

  return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dek = getDEK(sessionData);
  if (!dek) {
    return NextResponse.json({ error: "PIN not set" }, { status: 403 });
  }

  const body = await request.json();
  const { file, data } = body as { file: string; data: unknown };

  if (!file || !data) {
    return NextResponse.json({ error: "Missing file or data" }, { status: 400 });
  }

  // Encrypt with DEK
  const encrypted = await encryptJSONWithDEK(data, dek);

  // Demo mode
  if (isDemo(sessionData)) {
    demoStore.set(`${file}.enc`, encrypted);
    const stepIndex = [
      "about-you",
      "health",
      "insurance",
      "people",
      "documents",
      "wishes",
    ].indexOf(file);
    if (stepIndex >= 0) {
      const existing = demoStore.get("_meta.json") as MetadataFile | null;
      if (existing) {
        if (!existing.completed_steps.includes(stepIndex)) {
          existing.completed_steps.push(stepIndex);
        }
        existing.updated_at = new Date().toISOString();
        demoStore.set("_meta.json", existing);
      }
    }
    return NextResponse.json({ success: true, fileId: "demo" });
  }

  // Production: Google Drive
  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);

  if (!session.drive_folder_id) {
    const folderId = await createIncaseFolder(auth);
    session.drive_folder_id = folderId;
    await setSession(session);
  }
  const folderId = session.drive_folder_id!;

  const fileId = await writeEncrypted(auth, folderId, `${file}.enc`, encrypted);

  // Update metadata
  const stepIndex = [
    "about-you",
    "health",
    "insurance",
    "people",
    "documents",
    "wishes",
  ].indexOf(file);
  if (stepIndex >= 0) {
    const metaRaw = await readFileRaw(auth, folderId, "_meta.json");
    let metadata: MetadataFile | null = null;
    try {
      metadata = metaRaw ? JSON.parse(metaRaw) : null;
    } catch {
      /* ignore */
    }
    if (metadata) {
      if (!metadata.completed_steps.includes(stepIndex)) {
        metadata.completed_steps.push(stepIndex);
      }
      metadata.updated_at = new Date().toISOString();
      await writeFileRaw(auth, folderId, "_meta.json", JSON.stringify(metadata, null, 2));
    }
  }

  return NextResponse.json({ success: true, fileId });
}
