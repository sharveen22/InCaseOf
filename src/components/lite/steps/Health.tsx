"use client";

import { useState, useEffect } from "react";
import { useWizard } from "@/contexts/WizardContext";
import FileUpload from "@/components/lite/FileUpload";
import AttachmentViewer from "@/components/lite/AttachmentViewer";
import type { HealthData, Medication, Attachment } from "@/lib/drive/schema";

const EMPTY: HealthData = {
  conditions: [],
  medications: [],
  allergies: [],
  doctor_name: "",
  doctor_phone: "",
  hospital_preference: "",
  notes: "",
};

export default function Health() {
  const { data, saveStep, saving, next, prev, readOnly, attachmentUrls } = useWizard();
  const [form, setForm] = useState<HealthData>(EMPTY);
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");

  useEffect(() => {
    const saved = data["health"] as HealthData | undefined;
    if (saved) setForm({ ...EMPTY, ...saved });
  }, [data]);

  const addTag = (field: "allergies" | "conditions", value: string, setter: (v: string) => void) => {
    if (value.trim() && !form[field].includes(value.trim())) {
      setForm((f) => ({ ...f, [field]: [...f[field], value.trim()] }));
      setter("");
    }
  };

  const removeTag = (field: "allergies" | "conditions", value: string) =>
    setForm((f) => ({ ...f, [field]: (f[field] as string[]).filter((v) => v !== value) }));

  const addMedication = () =>
    setForm((f) => ({ ...f, medications: [...f.medications, { name: "", dosage: "", frequency: "" }] }));

  const updateMed = (i: number, field: keyof Medication, value: string) =>
    setForm((f) => ({
      ...f,
      medications: f.medications.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)),
    }));

  const removeMed = (i: number) =>
    setForm((f) => ({ ...f, medications: f.medications.filter((_, idx) => idx !== i) }));

  const flushPendingTags = (): HealthData => {
    let updated = form;
    if (allergyInput.trim() && !form.allergies.includes(allergyInput.trim())) {
      updated = { ...updated, allergies: [...updated.allergies, allergyInput.trim()] };
      setAllergyInput("");
    }
    if (conditionInput.trim() && !form.conditions.includes(conditionInput.trim())) {
      updated = { ...updated, conditions: [...updated.conditions, conditionInput.trim()] };
      setConditionInput("");
    }
    if (updated !== form) setForm(updated);
    return updated;
  };

  const handleSaveOnly = async () => {
    const current = flushPendingTags();
    await saveStep("health", current);
  };

  const handleSaveAndNext = async () => {
    const current = flushPendingTags();
    await saveStep("health", current);
    next();
  };

  return (
    <div className="wizard__step">
      <h2 className="wizard__step-title">Health Information</h2>
      <p className="wizard__step-sub">
        Critical medical details that could save your life in an emergency.
      </p>

      <div className="wizard__fields">
        <div className="wizard__field">
          <label className="wizard__label">Allergies</label>
          <div className="wizard__tag-input">
            {!readOnly && (
              <input className="wizard__input" value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("allergies", allergyInput, setAllergyInput))} placeholder="Type and press Enter (e.g. Penicillin)" />
            )}
            <div className="wizard__tags">
              {form.allergies.map((a) => (
                <span key={a} className="wizard__tag wizard__tag--red">{a}{!readOnly && <button type="button" onClick={() => removeTag("allergies", a)} className="wizard__tag-x">×</button>}</span>
              ))}
              {readOnly && form.allergies.length === 0 && <span className="wizard__empty-hint">None listed</span>}
            </div>
          </div>
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Medical conditions</label>
          <div className="wizard__tag-input">
            {!readOnly && (
              <input className="wizard__input" value={conditionInput} onChange={(e) => setConditionInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("conditions", conditionInput, setConditionInput))} placeholder="Type and press Enter (e.g. Asthma)" />
            )}
            <div className="wizard__tags">
              {form.conditions.map((c) => (
                <span key={c} className="wizard__tag">{c}{!readOnly && <button type="button" onClick={() => removeTag("conditions", c)} className="wizard__tag-x">×</button>}</span>
              ))}
              {readOnly && form.conditions.length === 0 && <span className="wizard__empty-hint">None listed</span>}
            </div>
          </div>
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Medications</label>
          {form.medications.map((med, i) => (
            <div key={i} className="wizard__repeater-row">
              <input className="wizard__input wizard__input--sm" placeholder="Medication name" value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} readOnly={readOnly} />
              <input className="wizard__input wizard__input--sm" placeholder="Dosage" value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} readOnly={readOnly} />
              <input className="wizard__input wizard__input--sm" placeholder="Frequency" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} readOnly={readOnly} />
              {!readOnly && <button type="button" className="wizard__remove-btn" onClick={() => removeMed(i)}>×</button>}
            </div>
          ))}
          {readOnly && form.medications.length === 0 && <span className="wizard__empty-hint">None listed</span>}
          {!readOnly && <button type="button" className="wizard__add-btn" onClick={addMedication}>+ Add medication</button>}
        </div>

        <div className="wizard__row">
          <div className="wizard__field">
            <label className="wizard__label">Doctor name</label>
            <input className="wizard__input" value={form.doctor_name || ""} onChange={(e) => setForm((f) => ({ ...f, doctor_name: e.target.value }))} readOnly={readOnly} />
          </div>
          <div className="wizard__field">
            <label className="wizard__label">Doctor phone</label>
            {readOnly && form.doctor_phone ? (
              <a href={`tel:${form.doctor_phone}`} className="wizard__input wizard__input--link">{form.doctor_phone}</a>
            ) : (
              <input className="wizard__input" type="tel" value={form.doctor_phone || ""} onChange={(e) => setForm((f) => ({ ...f, doctor_phone: e.target.value }))} readOnly={readOnly} />
            )}
          </div>
        </div>

        <div className="wizard__field">
          <label className="wizard__label">Additional notes</label>
          <textarea className="wizard__textarea" rows={3} value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Anything else medical professionals should know" readOnly={readOnly} />
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
          <button className="btn btn--outline-dark" onClick={prev}>Back</button>
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
