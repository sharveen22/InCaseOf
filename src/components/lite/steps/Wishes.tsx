"use client";

import { useState, useEffect } from "react";
import { useWizard } from "@/contexts/WizardContext";
import FileUpload from "@/components/lite/FileUpload";
import AttachmentViewer from "@/components/lite/AttachmentViewer";
import type { WishesData, Attachment } from "@/lib/drive/schema";

const EMPTY: WishesData = {
  dnr: "not_specified",
  organ_donor: "not_specified",
  religious_considerations: "",
  special_instructions: "",
  lawyer_name: "",
  lawyer_phone: "",
  poa_holder: "",
  poa_holder_phone: "",
};

export default function Wishes() {
  const { data, saveStep, saving, prev, readOnly, attachmentUrls } = useWizard();
  const [form, setForm] = useState<WishesData>(EMPTY);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const saved = data["wishes"] as WishesData | undefined;
    if (saved) setForm({ ...EMPTY, ...saved });
  }, [data]);

  const handleSave = async () => {
    await saveStep("wishes", form);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch("/api/lite/share", { method: "POST" });
      const json = await res.json();
      if (json.viewLink) setShareLink(json.viewLink);
    } catch { /* ignore */ }
    setSharing(false);
  };

  return (
    <div className="wizard__step">
      <h2 className="wizard__step-title">Wishes & Instructions</h2>
      <p className="wizard__step-sub">
        Anything else someone helping you should know.
      </p>

      <div className="wizard__fields">
        <div className="wizard__row">
          <div className="wizard__field">
            <label className="wizard__label">Do Not Resuscitate (DNR)</label>
            {readOnly ? (
              <input className="wizard__input" value={form.dnr === "yes" ? "Yes, has a DNR" : form.dnr === "no" ? "No" : "Not specified"} readOnly />
            ) : (
              <select className="wizard__input" value={form.dnr} onChange={(e) => setForm((f) => ({ ...f, dnr: e.target.value as WishesData["dnr"] }))}>
                <option value="not_specified">Prefer not to say</option>
                <option value="yes">Yes, I have a DNR</option>
                <option value="no">No</option>
              </select>
            )}
          </div>
          <div className="wizard__field">
            <label className="wizard__label">Organ donor</label>
            {readOnly ? (
              <input className="wizard__input" value={form.organ_donor === "yes" ? "Yes" : form.organ_donor === "no" ? "No" : "Not specified"} readOnly />
            ) : (
              <select className="wizard__input" value={form.organ_donor} onChange={(e) => setForm((f) => ({ ...f, organ_donor: e.target.value as WishesData["organ_donor"] }))}>
                <option value="not_specified">Prefer not to say</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            )}
          </div>
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Special instructions</label>
          <textarea className="wizard__textarea" rows={4} value={form.special_instructions || ""} onChange={(e) => setForm((f) => ({ ...f, special_instructions: e.target.value }))} placeholder="e.g. Contact the Australian Embassy if I'm hospitalised abroad. My dog needs to be fed, call my neighbour Maria." readOnly={readOnly} />
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Religious or cultural considerations</label>
          <input className="wizard__input" value={form.religious_considerations || ""} onChange={(e) => setForm((f) => ({ ...f, religious_considerations: e.target.value }))} placeholder="Any preferences for medical or end-of-life care" readOnly={readOnly} />
        </div>

        <div className="wizard__row">
          <div className="wizard__field">
            <label className="wizard__label">Lawyer / legal contact</label>
            <input className="wizard__input" value={form.lawyer_name || ""} onChange={(e) => setForm((f) => ({ ...f, lawyer_name: e.target.value }))} placeholder="Name" readOnly={readOnly} />
          </div>
          <div className="wizard__field">
            <label className="wizard__label">Lawyer phone</label>
            {readOnly && form.lawyer_phone ? (
              <a href={`tel:${form.lawyer_phone}`} className="wizard__input wizard__input--link">{form.lawyer_phone}</a>
            ) : (
              <input className="wizard__input" type="tel" value={form.lawyer_phone || ""} onChange={(e) => setForm((f) => ({ ...f, lawyer_phone: e.target.value }))} readOnly={readOnly} />
            )}
          </div>
        </div>

        <div className="wizard__row">
          <div className="wizard__field">
            <label className="wizard__label">Power of Attorney holder</label>
            <input className="wizard__input" value={form.poa_holder || ""} onChange={(e) => setForm((f) => ({ ...f, poa_holder: e.target.value }))} placeholder="Name (if applicable)" readOnly={readOnly} />
          </div>
          <div className="wizard__field">
            <label className="wizard__label">POA holder phone</label>
            {readOnly && form.poa_holder_phone ? (
              <a href={`tel:${form.poa_holder_phone}`} className="wizard__input wizard__input--link">{form.poa_holder_phone}</a>
            ) : (
              <input className="wizard__input" type="tel" value={form.poa_holder_phone || ""} onChange={(e) => setForm((f) => ({ ...f, poa_holder_phone: e.target.value }))} readOnly={readOnly} />
            )}
          </div>
        </div>

        {readOnly ? (
          <AttachmentViewer attachments={form.attachments || []} attachmentUrls={attachmentUrls} />
        ) : (
          <FileUpload
            attachments={form.attachments || []}
            onChange={(atts: Attachment[]) => setForm((f) => ({ ...f, attachments: atts }))}
          />
        )}
      </div>

      {!readOnly && (
        <>
          <div className="wizard__actions">
            <button className="btn btn--outline-dark" onClick={prev}>Back</button>
            <button className="btn btn--gold" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="wizard__complete">
            <h3 className="wizard__complete-title">Your emergency kit is ready.</h3>
            <p className="wizard__complete-sub">
              All data is encrypted with your PIN. Share the link and PIN with your emergency contact.
            </p>
            <div className="wizard__complete-actions">
              <button className="btn btn--gold" onClick={handleShare} disabled={sharing}>
                {sharing ? "Creating link..." : "Share with my contact"}
              </button>
              <a href="/api/lite/pdf" className="btn btn--outline-dark" download="incaseof-emergency-card.pdf">
                Download emergency card (PDF)
              </a>
            </div>
            {shareLink && (
              <div className="wizard__share-link">
                <label className="wizard__label">Share this link with your emergency contact:</label>
                <input className="wizard__input" readOnly value={shareLink} onClick={(e) => (e.target as HTMLInputElement).select()} />
                <p className="wizard__hint">
                  They will need your 6-digit PIN to decrypt and view your information.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
