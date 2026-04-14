import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth/session";
import { getAuthenticatedClient, refreshTokenIfNeeded } from "@/lib/auth/google";
import { readFileRaw } from "@/lib/drive/client";
import { decryptJSONWithDEK } from "@/lib/crypto";
import { demoStore } from "@/lib/demo-store";
// Lazy import to avoid loading jsPDF until needed
import type { AboutYouData, HealthData, InsuranceData, PeopleData } from "@/lib/drive/schema";

export async function GET() {
  const sessionData = await getSession();
  if (!sessionData?.drive_folder_id || !sessionData.dek) {
    return NextResponse.json({ error: "Not authenticated or PIN not set" }, { status: 401 });
  }

  const { dek } = sessionData;

  async function decryptFile<T>(encrypted: string | null): Promise<T | undefined> {
    if (!encrypted) return undefined;
    try {
      return await decryptJSONWithDEK<T>(encrypted, dek!);
    } catch {
      return undefined;
    }
  }

  let about: AboutYouData | undefined;
  let health: HealthData | undefined;
  let insurance: InsuranceData | undefined;
  let people: PeopleData | undefined;

  if (sessionData.drive_folder_id === "demo-local") {
    about = await decryptFile<AboutYouData>(demoStore.get("about-you.enc") as string | null);
    health = await decryptFile<HealthData>(demoStore.get("health.enc") as string | null);
    insurance = await decryptFile<InsuranceData>(demoStore.get("insurance.enc") as string | null);
    people = await decryptFile<PeopleData>(demoStore.get("people.enc") as string | null);
  } else {
    const { session, refreshed } = await refreshTokenIfNeeded(sessionData);
    if (refreshed) await setSession(session);

    const auth = getAuthenticatedClient(session);
    const folderId = session.drive_folder_id!;

    const [aboutEnc, healthEnc, insuranceEnc, peopleEnc] = await Promise.all([
      readFileRaw(auth, folderId, "about-you.enc"),
      readFileRaw(auth, folderId, "health.enc"),
      readFileRaw(auth, folderId, "insurance.enc"),
      readFileRaw(auth, folderId, "people.enc"),
    ]);

    about = await decryptFile<AboutYouData>(aboutEnc);
    health = await decryptFile<HealthData>(healthEnc);
    insurance = await decryptFile<InsuranceData>(insuranceEnc);
    people = await decryptFile<PeopleData>(peopleEnc);
  }

  const { generateEmergencyCard } = await import("@/lib/pdf/generate");
  const pdfBuffer = generateEmergencyCard({ about, health, insurance, people });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="incaseof-emergency-card.pdf"',
    },
  });
}
