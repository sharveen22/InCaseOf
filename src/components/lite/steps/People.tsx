"use client";

import { useState, useEffect } from "react";
import { useWizard } from "@/contexts/WizardContext";
import FileUpload from "@/components/lite/FileUpload";
import AttachmentViewer from "@/components/lite/AttachmentViewer";
import type { PeopleData, EmergencyContact, Attachment } from "@/lib/drive/schema";

const EMPTY_CONTACT: EmergencyContact = {
  name: "",
  relationship: "",
  phone: "",
  email: "",
  priority: 1,
  share_level: "full",
  notes: "",
};

export default function People() {
  const { data, saveStep, saving, next, prev, readOnly, attachmentUrls } = useWizard();
  const [contacts, setContacts] = useState<EmergencyContact[]>([{ ...EMPTY_CONTACT }]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    const saved = data["people"] as PeopleData | undefined;
    if (saved?.contacts?.length) setContacts(saved.contacts);
    if (saved?.attachments) setAttachments(saved.attachments);
  }, [data]);

  const updateContact = (i: number, field: keyof EmergencyContact, value: string | number) =>
    setContacts((cs) => cs.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const addContact = () =>
    setContacts((cs) => [...cs, { ...EMPTY_CONTACT, priority: cs.length + 1 }]);

  const removeContact = (i: number) =>
    setContacts((cs) => cs.filter((_, idx) => idx !== i));

  const handleSaveOnly = async () => {
    await saveStep("people", { contacts, attachments });
  };

  const handleSaveAndNext = async () => {
    await saveStep("people", { contacts, attachments });
    next();
  };

  return (
    <div className="wizard__step">
      <h2 className="wizard__step-title">My People</h2>
      <p className="wizard__step-sub">
        Who should be contacted if something happens to you? Add them in priority order.
      </p>

      <div className="wizard__fields">
        {contacts.map((contact, i) => (
          <div key={i} className="wizard__card">
            <div className="wizard__card-header">
              <span className="wizard__card-badge">Contact #{i + 1}</span>
              {!readOnly && contacts.length > 1 && (
                <button type="button" className="wizard__remove-btn" onClick={() => removeContact(i)}>×</button>
              )}
            </div>
            <div className="wizard__row">
              <div className="wizard__field">
                <label className="wizard__label">Name {!readOnly && "*"}</label>
                <input className="wizard__input" value={contact.name} onChange={(e) => updateContact(i, "name", e.target.value)} placeholder="Full name" readOnly={readOnly} />
              </div>
              <div className="wizard__field">
                <label className="wizard__label">Relationship</label>
                <input className="wizard__input" value={contact.relationship} onChange={(e) => updateContact(i, "relationship", e.target.value)} placeholder="e.g. Mother, Brother, Friend" readOnly={readOnly} />
              </div>
            </div>
            <div className="wizard__row">
              <div className="wizard__field">
                <label className="wizard__label">Phone {!readOnly && "*"}</label>
                {readOnly && contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="wizard__input wizard__input--link wizard__input--call">{contact.phone}</a>
                ) : (
                  <input className="wizard__input" type="tel" value={contact.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} placeholder="+61 400 000 000" readOnly={readOnly} />
                )}
              </div>
              <div className="wizard__field">
                <label className="wizard__label">Email</label>
                {readOnly && contact.email ? (
                  <a href={`mailto:${contact.email}`} className="wizard__input wizard__input--link">{contact.email}</a>
                ) : (
                  <input className="wizard__input" type="email" value={contact.email || ""} onChange={(e) => updateContact(i, "email", e.target.value)} placeholder="email@example.com" readOnly={readOnly} />
                )}
              </div>
            </div>
            <div className="wizard__field">
              <label className="wizard__label">What should they be told?</label>
              {readOnly ? (
                <input className="wizard__input" value={contact.share_level === "full" ? "Everything (full details)" : contact.share_level === "medical_only" ? "Medical info only" : "Just notify them"} readOnly />
              ) : (
                <select className="wizard__input" value={contact.share_level} onChange={(e) => updateContact(i, "share_level", e.target.value)}>
                  <option value="full">Everything (full details)</option>
                  <option value="medical_only">Medical info only</option>
                  <option value="notify_only">Just notify them something happened</option>
                </select>
              )}
            </div>
          </div>
        ))}
        {!readOnly && contacts.length < 5 && (
          <button type="button" className="wizard__add-btn" onClick={addContact}>+ Add another contact</button>
        )}
        {readOnly && contacts.length === 0 && <span className="wizard__empty-hint">No emergency contacts listed</span>}

        {readOnly ? (
          <AttachmentViewer attachments={attachments} attachmentUrls={attachmentUrls} />
        ) : (
          <FileUpload
            attachments={attachments}
            onChange={setAttachments}
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
