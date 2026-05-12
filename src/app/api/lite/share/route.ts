import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/auth/csrf";
import { getSession, setSession } from "@/lib/auth/session";
import { getAuthenticatedClient, refreshTokenIfNeeded } from "@/lib/auth/google";
import {
  grantServiceAccountFolderAccess,
  revokeServiceAccountFolderAccess,
  unshareFolder,
  writeFileRaw,
} from "@/lib/drive/client";
import { createShareSecret, encodeShareToken, hashShareSecret } from "@/lib/share-token";
import { demoStore } from "@/lib/demo-store";
import type { ShareManifestFile } from "@/lib/drive/schema";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!sessionData.drive_folder_id) {
    return NextResponse.json({ error: "No folder found" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const shareSecret = createShareSecret();
  const shareToken = encodeShareToken(sessionData.drive_folder_id, shareSecret);
  const viewLink = `${baseUrl}/lite/view/${shareToken}`;
  const shareManifest: ShareManifestFile = {
    version: 1,
    share_secret_hash: hashShareSecret(shareSecret),
    created_at: new Date().toISOString(),
    revoked_at: null,
  };

  // Demo mode — skip Google Drive permissions
  if (sessionData.drive_folder_id === "demo-local") {
    demoStore.set("_share.json", shareManifest);
    return NextResponse.json({
      success: true,
      driveLink: viewLink,
      viewLink,
    });
  }

  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);
  try {
    await writeFileRaw(
      auth,
      session.drive_folder_id!,
      "_share.json",
      JSON.stringify(shareManifest, null, 2)
    );

    // Remove any legacy public-link permission before granting the server gate.
    await unshareFolder(auth, session.drive_folder_id!);
    await grantServiceAccountFolderAccess(auth, session.drive_folder_id!);
  } catch (err) {
    console.error("share create error:", err);
    const message = err instanceof Error && err.message.startsWith("Missing GOOGLE_SERVICE_ACCOUNT")
      ? "Emergency sharing is not configured yet. Please try again later."
      : "Could not create share link. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    driveLink: viewLink,
    viewLink,
  });
}

export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!sessionData.drive_folder_id) {
    return NextResponse.json({ error: "No folder found" }, { status: 400 });
  }

  if (sessionData.drive_folder_id === "demo-local") {
    const existing = demoStore.get("_share.json") as ShareManifestFile | null;
    if (existing) {
      demoStore.set("_share.json", {
        ...existing,
        revoked_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ success: true });
  }

  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);
  try {
    await writeFileRaw(
      auth,
      session.drive_folder_id!,
      "_share.json",
      JSON.stringify({
        version: 1,
        share_secret_hash: "",
        created_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      } satisfies ShareManifestFile, null, 2)
    );
    await revokeServiceAccountFolderAccess(auth, session.drive_folder_id!);
    await unshareFolder(auth, session.drive_folder_id!);
  } catch (err) {
    console.error("share revoke error:", err);
    const message = err instanceof Error ? err.message : "Unable to revoke shared access";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
