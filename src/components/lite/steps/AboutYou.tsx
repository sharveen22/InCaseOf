"use client";

import { useState, useEffect } from "react";
import { useWizard } from "@/contexts/WizardContext";
import FileUpload from "@/components/lite/FileUpload";
import AttachmentViewer from "@/components/lite/AttachmentViewer";
import type { AboutYouData, Attachment } from "@/lib/drive/schema";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

const EMPTY: AboutYouData = {
  full_name: "",
  preferred_name: "",
  date_of_birth: "",
  blood_type: "",
  nationality: "",
  languages: [],
  address: "",
  phone: "",
};

export default function AboutYou() {
  const { data, saveStep, saving, next, readOnly, attachmentUrls } = useWizard();
  const [form, setForm] = useState<AboutYouData>(EMPTY);
  const [langInput, setLangInput] = useState("");

  useEffect(() => {
    const saved = data["about-you"] as AboutYouData | undefined;
    if (saved) setForm({ ...EMPTY, ...saved });
  }, [data]);

  const update = (field: keyof AboutYouData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const addLanguage = () => {
    if (langInput.trim() && !form.languages.includes(langInput.trim())) {
      setForm((f) => ({ ...f, languages: [...f.languages, langInput.trim()] }));
      setLangInput("");
    }
  };

  const removeLanguage = (lang: string) =>
    setForm((f) => ({ ...f, languages: f.languages.filter((l) => l !== lang) }));

  const handleSaveOnly = async () => {
    await saveStep("about-you", form);
  };

  const handleSaveAndNext = async () => {
    await saveStep("about-you", form);
    next();
  };

  return (
    <div className="wizard__step">
      <h2 className="wizard__step-title">About You</h2>
      <p className="wizard__step-sub">
        Basic information that identifies you in an emergency.
      </p>

      <div className="wizard__fields">
        <div className="wizard__field">
          <label className="wizard__label">Full name {!readOnly && "*"}</label>
          <input className="wizard__input" type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="As it appears on your passport" readOnly={readOnly} />
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Preferred name</label>
          <input className="wizard__input" type="text" value={form.preferred_name || ""} onChange={(e) => update("preferred_name", e.target.value)} placeholder="What people call you" readOnly={readOnly} />
        </div>

        <div className="wizard__row">
          <div className="wizard__field">
            <label className="wizard__label">Date of birth {!readOnly && "*"}</label>
            <input className="wizard__input" type={readOnly ? "text" : "date"} value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} readOnly={readOnly} />
          </div>
          <div className="wizard__field">
            <label className="wizard__label">Blood type</label>
            {readOnly ? (
              <input className="wizard__input" type="text" value={form.blood_type || "—"} readOnly />
            ) : (
              <select className="wizard__input" value={form.blood_type} onChange={(e) => update("blood_type", e.target.value)}>
                <option value="">Select...</option>
                {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Nationality</label>
          <input className="wizard__input" type="text" value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. Australian" readOnly={readOnly} />
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Languages spoken</label>
          <div className="wizard__tag-input">
            {!readOnly && (
              <input className="wizard__input" type="text" value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())} placeholder="Type and press Enter" />
            )}
            <div className="wizard__tags">
              {form.languages.map((l) => (
                <span key={l} className="wizard__tag">
                  {l}
                  {!readOnly && <button type="button" onClick={() => removeLanguage(l)} className="wizard__tag-x">×</button>}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Phone number</label>
          {readOnly && form.phone ? (
            <a href={`tel:${form.phone}`} className="wizard__input wizard__input--link">{form.phone}</a>
          ) : (
            <input className="wizard__input" type="tel" value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="+61 400 000 000" readOnly={readOnly} />
          )}
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Home address</label>
          <input className="wizard__input" type="text" value={form.address || ""} onChange={(e) => update("address", e.target.value)} placeholder="Your primary residence" readOnly={readOnly} />
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
        <div className="wizard__actions">
          <button className="btn btn--outline-dark" onClick={handleSaveOnly} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="btn btn--gold" onClick={handleSaveAndNext} disabled={saving}>
            {saving ? "Saving..." : "Save & Next"}
          </button>
        </div>
      )}
    </div>
  );
}
