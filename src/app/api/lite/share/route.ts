import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth/session";
import { getAuthenticatedClient, refreshTokenIfNeeded } from "@/lib/auth/google";
import { shareFolder } from "@/lib/drive/client";

export async function POST() {
  const sessionData = await getSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!sessionData.drive_folder_id) {
    return NextResponse.json({ error: "No folder found" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const viewLink = `${baseUrl}/lite/view/${sessionData.drive_folder_id}`;

  // Demo mode — skip Google Drive sharing
  if (sessionData.drive_folder_id === "demo-local") {
    return NextResponse.json({
      success: true,
      driveLink: viewLink,
      viewLink,
    });
  }

  const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
  if (refreshed) await setSession(session);

  const auth = getAuthenticatedClient(session);
  const driveLink = await shareFolder(auth, session.drive_folder_id!);

  return NextResponse.json({
    success: true,
    driveLink,
    viewLink,
  });
}
