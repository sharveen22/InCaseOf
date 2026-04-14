import { jsPDF } from "jspdf";
import type { AboutYouData, HealthData, InsuranceData, PeopleData } from "@/lib/drive/schema";

interface CardData {
  about?: AboutYouData;
  health?: HealthData;
  insurance?: InsuranceData;
  people?: PeopleData;
}

export function generateEmergencyCard(data: CardData): Buffer {
  // Credit card size: 85.6mm x 53.98mm — we'll do a slightly larger wallet card
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [90, 55],
  });

  const w = 90;
  const margin = 5;
  let y = 7;

  // Background
  doc.setFillColor(22, 20, 25);
  doc.rect(0, 0, w, 55, "F");

  // Gold accent line
  doc.setFillColor(196, 132, 29);
  doc.rect(0, 0, w, 2, "F");

  // Title
  doc.setTextColor(196, 132, 29);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INCASEOF EMERGENCY CARD", margin, y);

  // Name
  y += 7;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.about?.full_name || "Name not set", margin, y);

  // DOB + Blood type
  y += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const dob = data.about?.date_of_birth || "—";
  const blood = data.about?.blood_type || "—";
  doc.text(`DOB: ${dob}  |  Blood: ${blood}  |  ${data.about?.nationality || ""}`, margin, y);

  // Allergies
  if (data.health?.allergies?.length) {
    y += 6;
    doc.setTextColor(220, 53, 69);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("ALLERGIES: " + data.health.allergies.join(", "), margin, y);
  }

  // Conditions
  if (data.health?.conditions?.length) {
    y += 4;
    doc.setTextColor(255, 193, 7);
    doc.text("CONDITIONS: " + data.health.conditions.join(", "), margin, y);
  }

  // Insurance
  const travelIns = data.insurance?.policies?.find((p) => p.type === "travel");
  if (travelIns?.provider) {
    y += 5;
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    doc.text(`Insurance: ${travelIns.provider} #${travelIns.policy_number}`, margin, y);
    if (travelIns.emergency_line) {
      y += 3.5;
      doc.text(`Emergency line: ${travelIns.emergency_line}`, margin, y);
    }
  }

  // Emergency contact
  const primaryContact = data.people?.contacts?.[0];
  if (primaryContact) {
    y += 5;
    doc.setTextColor(196, 132, 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("EMERGENCY CONTACT:", margin, y);
    y += 3.5;
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text(`${primaryContact.name} (${primaryContact.relationship}) ${primaryContact.phone}`, margin, y);
  }

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(5);
  doc.text("tryincaseof.com", margin, 52);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
