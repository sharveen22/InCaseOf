"use client";

import { useState, useEffect } from "react";
import { useWizard } from "@/contexts/WizardContext";
import FileUpload from "@/components/lite/FileUpload";
import AttachmentViewer from "@/components/lite/AttachmentViewer";
import type { InsuranceData, InsuranceEntry, Attachment } from "@/lib/drive/schema";

const EMPTY_POLICY: InsuranceEntry = {
  type: "travel",
  provider: "",
  policy_number: "",
  emergency_line: "",
  expiry_date: "",
  agent_name: "",
  agent_phone: "",
  agent_email: "",
  notes: "",
};

const EMPTY: InsuranceData = { policies: [] };

export default function Insurance() {
  const { data, saveStep, saving, next, prev, readOnly, attachmentUrls } = useWizard();
  const [form, setForm] = useState<InsuranceData>(EMPTY);

  useEffect(() => {
    const saved = data["insurance"] as InsuranceData | undefined;
    if (saved?.policies?.length) {
      setForm(saved);
    } else {
      setForm({ policies: [{ ...EMPTY_POLICY, type: "travel" }, { ...EMPTY_POLICY, type: "health" }] });
    }
  }, [data]);

  const updatePolicy = (i: number, field: keyof InsuranceEntry, value: string) =>
    setForm((f) => ({
      ...f,
      policies: f.policies.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));

  const addPolicy = () =>
    setForm((f) => ({ ...f, policies: [...f.policies, { ...EMPTY_POLICY }] }));

  const removePolicy = (i: number) =>
    setForm((f) => ({ ...f, policies: f.policies.filter((_, idx) => idx !== i) }));

  const handleSaveOnly = async () => {
    await saveStep("insurance", form);
  };

  const handleSaveAndNext = async () => {
    await saveStep("insurance", form);
    next();
  };

  return (
    <div className="wizard__step">
      <h2 className="wizard__step-title">Insurance</h2>
      <p className="wizard__step-sub">
        Policy details so the right people can be contacted and claims can be processed quickly.
      </p>

      <div className="wizard__fields">
        {form.policies.map((policy, i) => (
          <div key={i} className="wizard__card">
            <div className="wizard__card-header">
              {readOnly ? (
                <span className="wizard__card-badge">{policy.type === "travel" ? "Travel Insurance" : policy.type === "health" ? "Health Insurance" : "Life Insurance"}</span>
              ) : (
                <select className="wizard__input wizard__input--sm" value={policy.type} onChange={(e) => updatePolicy(i, "type", e.target.value)}>
                  <option value="travel">Travel Insurance</option>
                  <option value="health">Health Insurance</option>
                  <option value="life">Life Insurance</option>
                </select>
              )}
              {!readOnly && form.policies.length > 1 && (
                <button type="button" className="wizard__remove-btn" onClick={() => removePolicy(i)}>×</button>
              )}
            </div>
            <div className="wizard__row">
              <div className="wizard__field">
                <label className="wizard__label">Provider</label>
                <input className="wizard__input" value={policy.provider} onChange={(e) => updatePolicy(i, "provider", e.target.value)} placeholder="e.g. World Nomads" readOnly={readOnly} />
              </div>
              <div className="wizard__field">
                <label className="wizard__label">Policy number</label>
                <input className="wizard__input" value={policy.policy_number} onChange={(e) => updatePolicy(i, "policy_number", e.target.value)} placeholder="e.g. WN-38291" readOnly={readOnly} />
              </div>
            </div>
            <div className="wizard__row">
              <div className="wizard__field">
                <label className="wizard__label">Emergency line</label>
                {readOnly && policy.emergency_line ? (
                  <a href={`tel:${policy.emergency_line}`} className="wizard__input wizard__input--link">{policy.emergency_line}</a>
                ) : (
                  <input className="wizard__input" type="tel" value={policy.emergency_line || ""} onChange={(e) => updatePolicy(i, "emergency_line", e.target.value)} placeholder="+1-800-555-0199" readOnly={readOnly} />
                )}
              </div>
              <div className="wizard__field">
                <label className="wizard__label">Expiry date</label>
                <input className="wizard__input" type={readOnly ? "text" : "date"} value={policy.expiry_date || ""} onChange={(e) => updatePolicy(i, "expiry_date", e.target.value)} readOnly={readOnly} />
              </div>
            </div>

            <div className="wizard__divider" />

            <div className="wizard__row">
              <div className="wizard__field">
                <label className="wizard__label">Insurance agent / broker name</label>
                <input className="wizard__input" value={policy.agent_name || ""} onChange={(e) => updatePolicy(i, "agent_name", e.target.value)} placeholder="e.g. John Smith" readOnly={readOnly} />
              </div>
              <div className="wizard__field">
                <label className="wizard__label">Agent phone</label>
                {readOnly && policy.agent_phone ? (
                  <a href={`tel:${policy.agent_phone}`} className="wizard__input wizard__input--link">{policy.agent_phone}</a>
                ) : (
                  <input className="wizard__input" type="tel" value={policy.agent_phone || ""} onChange={(e) => updatePolicy(i, "agent_phone", e.target.value)} placeholder="+61 400 000 000" readOnly={readOnly} />
                )}
              </div>
            </div>
            <div className="wizard__field">
              <label className="wizard__label">Agent email</label>
              {readOnly && policy.agent_email ? (
                <a href={`mailto:${policy.agent_email}`} className="wizard__input wizard__input--link">{policy.agent_email}</a>
              ) : (
                <input className="wizard__input" type="email" value={policy.agent_email || ""} onChange={(e) => updatePolicy(i, "agent_email", e.target.value)} placeholder="agent@insurance.com" readOnly={readOnly} />
              )}
            </div>

            <div className="wizard__field">
              <label className="wizard__label">Additional notes / claim instructions</label>
              <textarea className="wizard__textarea" rows={3} value={policy.notes || ""} onChange={(e) => updatePolicy(i, "notes", e.target.value)} placeholder="e.g. Call agent first before going to hospital." readOnly={readOnly} />
            </div>
          </div>
        ))}
        {!readOnly && <button type="button" className="wizard__add-btn" onClick={addPolicy}>+ Add another policy</button>}
        {readOnly && form.policies.length === 0 && <span className="wizard__empty-hint">No insurance policies listed</span>}

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
