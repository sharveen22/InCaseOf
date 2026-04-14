import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth/session";
import { getAuthenticatedClient, refreshTokenIfNeeded } from "@/lib/auth/google";
import { createIncaseFolder, writeEncrypted, deleteFile } from "@/lib/drive/client";
import { encryptWithDEK } from "@/lib/crypto";
import { demoStore } from "@/lib/demo-store";
import { MAX_UPLOAD_SIZE, ALLOWED_MIME_TYPES } from "@/lib/drive/schema";

/**
 * POST — Upload a file (encrypted)
 * Expects multipart/form-data with field "file" and "attachmentId"
 */
export async function POST(request: NextRequest) {
  const sessionData = await getSession();
  if (!sessionData?.dek) {
    return NextResponse.json({ error: "Not authenticated or PIN not set" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const attachmentId = formData.get("attachmentId") as string | null;

  if (!file || !attachmentId) {
    return NextResponse.json({ error: "Missing file or attachmentId" }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({
      error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE / 1024 / 1024}MB. Consider clearing space on your Google Drive.`,
    }, { status: 413 });
  }

  // Validate type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({
      error: `File type "${file.type}" is not supported. Allowed: images, PDFs, Word docs, and videos.`,
    }, { status: 415 });
  }

  // Read file as ArrayBuffer and encrypt
  const arrayBuffer = await file.arrayBuffer();
  const encrypted = await encryptWithDEK(arrayBuffer, sessionData.dek);
  const filename = `att_${attachmentId}.enc`;

  // Demo mode
  if (sessionData.drive_folder_id === "demo-local") {
    demoStore.set(filename, encrypted);
    return NextResponse.json({ success: true, fileId: "demo" });
  }

  // Production: upload to Drive
  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);

  if (!session.drive_folder_id) {
    const folderId = await createIncaseFolder(auth);
    session.drive_folder_id = folderId;
    await setSession(session);
  }

  try {
    const fileId = await writeEncrypted(auth, session.drive_folder_id!, filename, encrypted);
    return NextResponse.json({ success: true, fileId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    // Check for Drive quota exceeded
    if (message.includes("storageQuotaExceeded") || message.includes("insufficient")) {
      return NextResponse.json({
        error: "Google Drive storage is full. Please free up space in your Google Drive and try again.",
      }, { status: 507 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE — Remove an uploaded file
 */
export async function DELETE(request: NextRequest) {
  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { attachmentId } = (await request.json()) as { attachmentId: string };
  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId" }, { status: 400 });
  }

  const filename = `att_${attachmentId}.enc`;

  if (sessionData.drive_folder_id === "demo-local") {
    demoStore.delete(filename);
    return NextResponse.json({ success: true });
  }

  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);

  if (!session.drive_folder_id) {
    return NextResponse.json({ error: "No folder" }, { status: 400 });
  }

  await deleteFile(auth, session.drive_folder_id!, filename);
  return NextResponse.json({ success: true });
}
