"use client";

import { useState, useEffect, useRef } from "react";
import { useWizard } from "@/contexts/WizardContext";
import FileUpload from "@/components/lite/FileUpload";
import AttachmentViewer from "@/components/lite/AttachmentViewer";
import type { DocumentsData, DocumentRef, Attachment } from "@/lib/drive/schema";

const DOC_TYPES: { value: DocumentRef["type"]; label: string; icon: string }[] = [
  { value: "passport", label: "Passport", icon: "🛂" },
  { value: "drivers_license", label: "Driver's License", icon: "🚗" },
  { value: "national_id", label: "National ID", icon: "🪪" },
  { value: "other", label: "Other", icon: "📄" },
];

const EMPTY_DOC: DocumentRef = {
  type: "passport",
  label: "",
  number: "",
  country: "",
  expiry_date: "",
};

export default function Documents() {
  const { data, saveStep, saving, next, prev, readOnly, attachmentUrls } = useWizard();
  const [docs, setDocs] = useState<DocumentRef[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = data["documents"] as DocumentsData | undefined;
    if (saved?.documents?.length) setDocs(saved.documents);
    if (saved?.attachments) setAttachments(saved.attachments);
  }, [data]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const updateDoc = (i: number, field: keyof DocumentRef, value: string) =>
    setDocs((ds) => ds.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));

  const addDoc = (type: DocumentRef["type"]) => {
    const info = DOC_TYPES.find((t) => t.value === type)!;
    setDocs((ds) => [...ds, { ...EMPTY_DOC, type, label: info.label }]);
    setEditing(docs.length);
    setDropdownOpen(false);
  };

  const removeDoc = (i: number) => {
    setDocs((ds) => ds.filter((_, idx) => idx !== i));
    if (editing === i) setEditing(null);
    else if (editing !== null && editing > i) setEditing(editing - 1);
  };

  const handleSaveOnly = async () => {
    await saveStep("documents", { documents: docs, attachments });
  };

  const handleSaveAndNext = async () => {
    await saveStep("documents", { documents: docs, attachments });
    next();
  };

  const getIcon = (type: string) => DOC_TYPES.find((t) => t.value === type)?.icon || "📄";

  return (
    <div className="wizard__step">
      <h2 className="wizard__step-title">Documents</h2>
      <p className="wizard__step-sub">
        Add your key identity documents so they can be referenced in an emergency.
      </p>

      <div className="wizard__fields">
        {/* Create button with dropdown (edit mode only) */}
        {!readOnly && (
          <div className="wizard__dropdown-wrap" ref={dropdownRef}>
            <button
              type="button"
              className="btn btn--gold"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              + Add Document
            </button>
            {dropdownOpen && (
              <div className="wizard__dropdown">
                {DOC_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className="wizard__dropdown-item"
                    onClick={() => addDoc(t.value)}
                  >
                    <span className="wizard__dropdown-icon">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Document tiles */}
        {docs.length > 0 && (
          <div className="wizard__tiles">
            {docs.map((doc, i) => (
              <div
                key={i}
                className={`wizard__tile ${!readOnly && editing === i ? "wizard__tile--active" : ""}`}
              >
                {!readOnly && (
                  <button
                    type="button"
                    className="wizard__tile-delete"
                    onClick={(e) => { e.stopPropagation(); removeDoc(i); }}
                    title="Delete document"
                  >
                    ×
                  </button>
                )}
                <div className="wizard__tile-body" onClick={() => !readOnly && setEditing(editing === i ? null : i)}>
                  <span className="wizard__tile-icon">{getIcon(doc.type)}</span>
                  <span className="wizard__tile-label">{doc.label || DOC_TYPES.find(t => t.value === doc.type)?.label}</span>
                  {doc.number && <span className="wizard__tile-number">{doc.number}</span>}
                  {doc.country && <span className="wizard__tile-expiry">{doc.country}</span>}
                  {doc.expiry_date && <span className="wizard__tile-expiry">Exp: {doc.expiry_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {docs.length === 0 && (
          <p className="wizard__empty-hint">{readOnly ? "No documents listed" : "No documents added yet. Click \"+ Add Document\" above to get started."}</p>
        )}

        {/* Edit form for selected tile (edit mode only) */}
        {!readOnly && editing !== null && docs[editing] && (
          <div className="wizard__card">
            <div className="wizard__card-header">
              <select className="wizard__input wizard__input--sm" value={docs[editing].type} onChange={(e) => updateDoc(editing, "type", e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button type="button" className="wizard__remove-btn" onClick={() => removeDoc(editing)}>×</button>
            </div>
            <div className="wizard__field">
              <label className="wizard__label">Label</label>
              <input className="wizard__input" value={docs[editing].label} onChange={(e) => updateDoc(editing, "label", e.target.value)} placeholder="e.g. Australian Passport" />
            </div>
            <div className="wizard__row">
              <div className="wizard__field">
                <label className="wizard__label">Document number</label>
                <input className="wizard__input" value={docs[editing].number} onChange={(e) => updateDoc(editing, "number", e.target.value)} placeholder="e.g. PA1234567" />
              </div>
              <div className="wizard__field">
                <label className="wizard__label">Country of issue</label>
                <input className="wizard__input" value={docs[editing].country || ""} onChange={(e) => updateDoc(editing, "country", e.target.value)} placeholder="e.g. Australia" />
              </div>
            </div>
            <div className="wizard__field">
              <label className="wizard__label">Expiry date</label>
              <input className="wizard__input" type="date" value={docs[editing].expiry_date || ""} onChange={(e) => updateDoc(editing, "expiry_date", e.target.value)} />
            </div>
            <button type="button" className="btn btn--outline-dark" style={{ marginTop: 12 }} onClick={() => setEditing(null)}>Done editing</button>
          </div>
        )}

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
