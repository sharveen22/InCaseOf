import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { demoStore } from "@/lib/demo-store";
import { verifyPin } from "@/lib/crypto";
import type { MetadataFile } from "@/lib/drive/schema";

/**
 * Download a publicly shared Drive file using the export URL.
 * This avoids the Drive API rate limiting / bot detection.
 */
async function downloadPublicFile(fileId: string): Promise<string> {
  // Use the Google Drive direct download link for public files
  const url = `https://drive.google.com/uc?id=${fileId}&export=download`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "InCaseOf/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  return res.text();
}

/**
 * POST — Verify PIN for shared view. Returns encrypted files + wrapped_dek + salt
 * so the client can unwrap the DEK and decrypt everything in the browser.
 * Body: { folderId, pin }
 */
export async function POST(request: NextRequest) {
  const { folderId, pin } = (await request.json()) as { folderId: string; pin: string };

  if (!folderId || !pin) {
    return NextResponse.json({ error: "Missing folderId or pin" }, { status: 400 });
  }

  // Demo mode
  if (folderId === "demo-local") {
    const meta = demoStore.get("_meta.json") as MetadataFile | null;
    if (!meta?.pin_check || !meta?.salt) {
      return NextResponse.json({ error: "No PIN set" }, { status: 400 });
    }

    const valid = await verifyPin(pin, meta.salt, meta.pin_check);
    if (!valid) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

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

  // Production: read from shared (public) Drive folder
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: missing GOOGLE_API_KEY" },
      { status: 500 }
    );
  }

  try {
    // Use googleapis library for listing (works fine with API key)
    const drive = google.drive({ version: "v3", auth: apiKey });

    // List all files in the shared folder, newest first
    const filesList = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, modifiedTime)",
      orderBy: "modifiedTime desc",
      spaces: "drive",
    });

    const files = filesList.data.files || [];

    // Find _meta.json
    const metaFile = files.find(f => f.name === "_meta.json");
    if (!metaFile?.id) {
      return NextResponse.json({ error: "No metadata found" }, { status: 400 });
    }

    // Download _meta.json content using public download URL
    const metaRaw = await downloadPublicFile(metaFile.id);
    const meta = JSON.parse(metaRaw) as MetadataFile;

    if (!meta.pin_check || !meta.salt) {
      return NextResponse.json({ error: "No PIN set" }, { status: 400 });
    }

    const valid = await verifyPin(pin, meta.salt, meta.pin_check);
    if (!valid) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    // Download all .enc files using public download URLs
    const encryptedFiles: Record<string, string> = {};
    const encFiles = files.filter(f => f.name?.endsWith(".enc") && f.id);

    // Download in parallel for speed
    const downloads = await Promise.allSettled(
      encFiles.map(async (file) => {
        const content = await downloadPublicFile(file.id!);
        const key = file.name!.replace(".enc", "");
        return { key, content };
      })
    );

    for (const result of downloads) {
      if (result.status === "fulfilled") {
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
