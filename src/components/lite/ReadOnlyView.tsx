import type { AboutYouData, HealthData, InsuranceData, PeopleData, DocumentsData, WishesData, Attachment } from "@/lib/drive/schema";

interface Props {
  data: {
    "about-you"?: AboutYouData;
    health?: HealthData;
    insurance?: InsuranceData;
    people?: PeopleData;
    documents?: DocumentsData;
    wishes?: WishesData;
  };
  attachmentUrls?: Record<string, string>; // att_<id> -> blob URL
}

const DOC_ICONS: Record<string, string> = {
  passport: "🛂",
  drivers_license: "🚗",
  national_id: "🪪",
  other: "📄",
};

const DOC_LABELS: Record<string, string> = {
  passport: "Passport",
  drivers_license: "Driver's License",
  national_id: "National ID",
  other: "Document",
};

function PhoneLink({ number, label }: { number: string; label?: string }) {
  const cleaned = number.replace(/[^+\d]/g, "");
  return (
    <a href={`tel:${cleaned}`} className="rov__phone-link">
      <span className="rov__phone-icon">📞</span>
      <span>{label || number}</span>
    </a>
  );
}

function AttachmentGallery({ attachments, urls }: { attachments?: Attachment[]; urls: Record<string, string> }) {
  if (!attachments?.length) return null;
  const available = attachments.filter(a => urls[`att_${a.id}`]);
  if (!available.length) return null;

  return (
    <div className="rov__attachments">
      {available.map(att => {
        const url = urls[`att_${att.id}`];
        const isImage = att.mime.startsWith("image/");
        const isPdf = att.mime === "application/pdf";
        const isVideo = att.mime.startsWith("video/");

        if (isImage) {
          return (
            <a key={att.id} href={url} target="_blank" rel="noopener" className="rov__att-thumb">
              <img src={url} alt={att.name} className="rov__att-img" />
              <span className="rov__att-name">{att.name}</span>
            </a>
          );
        }
        if (isVideo) {
          return (
            <div key={att.id} className="rov__att-video">
              <video src={url} controls className="rov__att-vid" />
              <span className="rov__att-name">{att.name}</span>
            </div>
          );
        }
        return (
          <a key={att.id} href={url} download={att.name} className="rov__att-file">
            <span className="rov__att-file-icon">{isPdf ? "📄" : "📎"}</span>
            <span className="rov__att-name">{att.name}</span>
          </a>
        );
      })}
    </div>
  );
}

export default function ReadOnlyView({ data, attachmentUrls = {} }: Props) {
  const about = data["about-you"];
  const health = data.health;
  const insurance = data.insurance;
  const people = data.people;
  const documents = data.documents;
  const wishes = data.wishes;

  const hasAllergies = health?.allergies && health.allergies.length > 0;
  const hasConditions = health?.conditions && health.conditions.length > 0;
  const hasCriticalMedical = hasAllergies || hasConditions;

  return (
    <div className="rov">
      {/* Header */}
      <div className="rov__header">
        <span className="rov__logo">InCaseOf</span>
        <h1 className="rov__title">Emergency Information</h1>
        <p className="rov__subtitle">
          Decrypted in your browser. Handle with care.
        </p>
      </div>

      {/* Critical medical alerts at the very top */}
      {hasCriticalMedical && (
        <section className="rov__section rov__section--alerts">
          {hasAllergies && (
            <div className="rov__alert rov__alert--red">
              <span className="rov__alert-icon">⚠️</span>
              <div>
                <strong className="rov__alert-title">ALLERGIES</strong>
                <span className="rov__alert-items">{health!.allergies.join(" · ")}</span>
              </div>
            </div>
          )}
          {hasConditions && (
            <div className="rov__alert rov__alert--yellow">
              <span className="rov__alert-icon">⚕️</span>
              <div>
                <strong className="rov__alert-title">MEDICAL CONDITIONS</strong>
                <span className="rov__alert-items">{health!.conditions.join(" · ")}</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Emergency contacts — shown early for quick access */}
      {people?.contacts?.length && people.contacts.length > 0 && (
        <section className="rov__section">
          <h2 className="rov__section-title">Emergency Contacts</h2>
          <div className="rov__contacts">
            {people.contacts.map((contact, i) => (
              <div key={i} className="rov__contact-card">
                <div className="rov__contact-header">
                  <div>
                    <span className="rov__contact-name">{contact.name}</span>
                    <span className="rov__contact-rel">{contact.relationship}</span>
                  </div>
                  {i === 0 && <span className="rov__badge rov__badge--primary">Primary</span>}
                </div>
                <div className="rov__contact-actions">
                  {contact.phone && (
                    <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="rov__call-btn">
                      📞 Call {contact.name.split(" ")[0]}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="rov__email-btn">
                      ✉️ {contact.email}
                    </a>
                  )}
                </div>
                {contact.notes && <p className="rov__contact-notes">{contact.notes}</p>}
              </div>
            ))}
          </div>
          <AttachmentGallery attachments={people.attachments} urls={attachmentUrls} />
        </section>
      )}

      {/* Personal Details */}
      {about && (
        <section className="rov__section">
          <h2 className="rov__section-title">Personal Details</h2>
          <div className="rov__grid">
            <div className="rov__item rov__item--span">
              <span className="rov__label">Full Name</span>
              <span className="rov__value rov__value--lg">{about.full_name}</span>
            </div>
            {about.date_of_birth && (
              <div className="rov__item">
                <span className="rov__label">Date of Birth</span>
                <span className="rov__value">{about.date_of_birth}</span>
              </div>
            )}
            {about.blood_type && (
              <div className="rov__item">
                <span className="rov__label">Blood Type</span>
                <span className="rov__value rov__value--accent rov__value--lg">{about.blood_type}</span>
              </div>
            )}
            {about.nationality && (
              <div className="rov__item">
                <span className="rov__label">Nationality</span>
                <span className="rov__value">{about.nationality}</span>
              </div>
            )}
            {about.phone && (
              <div className="rov__item">
                <span className="rov__label">Phone</span>
                <PhoneLink number={about.phone} />
              </div>
            )}
            {about.languages && about.languages.length > 0 && (
              <div className="rov__item">
                <span className="rov__label">Languages</span>
                <span className="rov__value">{about.languages.join(", ")}</span>
              </div>
            )}
            {about.address && (
              <div className="rov__item rov__item--span">
                <span className="rov__label">Address</span>
                <span className="rov__value">{about.address}</span>
              </div>
            )}
          </div>
          <AttachmentGallery attachments={about.attachments} urls={attachmentUrls} />
        </section>
      )}

      {/* Medical Information */}
      {health && (
        <section className="rov__section">
          <h2 className="rov__section-title">Medical Information</h2>

          {health.medications?.length > 0 && (
            <div className="rov__med-list">
              <h3 className="rov__label" style={{ marginBottom: 10, fontSize: 12 }}>Medications</h3>
              {health.medications.map((med, i) => (
                <div key={i} className="rov__med-item">
                  <span className="rov__med-name">{med.name}</span>
                  <span className="rov__med-detail">{med.dosage}{med.frequency ? ` · ${med.frequency}` : ""}</span>
                </div>
              ))}
            </div>
          )}

          {(health.doctor_name || health.doctor_phone) && (
            <div className="rov__doctor-card">
              <span className="rov__label">Treating Doctor</span>
              <div className="rov__doctor-info">
                {health.doctor_name && <span className="rov__value" style={{ fontWeight: 600 }}>{health.doctor_name}</span>}
                {health.doctor_phone && <PhoneLink number={health.doctor_phone} />}
              </div>
            </div>
          )}

          {health.hospital_preference && (
            <div style={{ marginTop: 12 }}>
              <span className="rov__label">Preferred Hospital</span>
              <span className="rov__value" style={{ display: "block", marginTop: 4 }}>{health.hospital_preference}</span>
            </div>
          )}

          {health.notes && (
            <div style={{ marginTop: 12 }}>
              <span className="rov__label">Additional Notes</span>
              <p className="rov__value" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{health.notes}</p>
            </div>
          )}
          <AttachmentGallery attachments={health.attachments} urls={attachmentUrls} />
        </section>
      )}

      {/* Insurance */}
      {insurance?.policies?.length && insurance.policies.length > 0 && (
        <section className="rov__section">
          <h2 className="rov__section-title">Insurance</h2>
          {insurance.policies.filter(p => p.provider).map((policy, i) => (
            <div key={i} className="rov__card">
              <div className="rov__card-header">
                <span className="rov__badge">{policy.type}</span>
                <span className="rov__value" style={{ fontWeight: 600, fontSize: 17 }}>{policy.provider}</span>
              </div>
              <div className="rov__grid" style={{ marginTop: 12 }}>
                <div className="rov__item">
                  <span className="rov__label">Policy #</span>
                  <span className="rov__value" style={{ fontFamily: "monospace" }}>{policy.policy_number}</span>
                </div>
                {policy.emergency_line && (
                  <div className="rov__item">
                    <span className="rov__label">Emergency Line</span>
                    <PhoneLink number={policy.emergency_line} />
                  </div>
                )}
                {policy.expiry_date && (
                  <div className="rov__item">
                    <span className="rov__label">Expiry</span>
                    <span className="rov__value">{policy.expiry_date}</span>
                  </div>
                )}
              </div>
              {(policy.agent_name || policy.agent_phone || policy.agent_email) && (
                <div className="rov__agent">
                  <span className="rov__label" style={{ color: "var(--accent)", display: "block", marginBottom: 8 }}>Insurance Agent / Broker</span>
                  <div className="rov__grid">
                    {policy.agent_name && (
                      <div className="rov__item">
                        <span className="rov__label">Name</span>
                        <span className="rov__value">{policy.agent_name}</span>
                      </div>
                    )}
                    {policy.agent_phone && (
                      <div className="rov__item">
                        <span className="rov__label">Phone</span>
                        <PhoneLink number={policy.agent_phone} />
                      </div>
                    )}
                    {policy.agent_email && (
                      <div className="rov__item">
                        <span className="rov__label">Email</span>
                        <a href={`mailto:${policy.agent_email}`} className="rov__value" style={{ color: "var(--accent)" }}>{policy.agent_email}</a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {policy.notes && (
                <div style={{ marginTop: 12 }}>
                  <span className="rov__label">Notes</span>
                  <p className="rov__value" style={{ marginTop: 4 }}>{policy.notes}</p>
                </div>
              )}
            </div>
          ))}
          <AttachmentGallery attachments={insurance.attachments} urls={attachmentUrls} />
        </section>
      )}

      {/* Documents */}
      {documents?.documents?.length && documents.documents.length > 0 && (
        <section className="rov__section">
          <h2 className="rov__section-title">Documents</h2>
          <div className="rov__doc-tiles">
            {documents.documents.map((doc, i) => (
              <div key={i} className="rov__doc-tile">
                <span className="rov__doc-icon">{DOC_ICONS[doc.type] || "📄"}</span>
                <span className="rov__doc-type">{DOC_LABELS[doc.type] || doc.type}</span>
                {doc.label && doc.label !== doc.type && (
                  <span className="rov__value" style={{ fontWeight: 600 }}>{doc.label}</span>
                )}
                <span className="rov__value" style={{ fontFamily: "monospace" }}>{doc.number}</span>
                {doc.country && <span className="rov__doc-meta">Country: {doc.country}</span>}
                {doc.expiry_date && <span className="rov__doc-meta">Expires: {doc.expiry_date}</span>}
              </div>
            ))}
          </div>
          <AttachmentGallery attachments={documents.attachments} urls={attachmentUrls} />
        </section>
      )}

      {/* Wishes & Directives */}
      {wishes && (wishes.special_instructions || wishes.dnr !== "not_specified" || wishes.organ_donor !== "not_specified" || wishes.lawyer_name || wishes.poa_holder) && (
        <section className="rov__section">
          <h2 className="rov__section-title">Wishes & Directives</h2>

          {(wishes.dnr && wishes.dnr !== "not_specified") || (wishes.organ_donor && wishes.organ_donor !== "not_specified") ? (
            <div className="rov__directives">
              {wishes.dnr && wishes.dnr !== "not_specified" && (
                <div className={`rov__directive ${wishes.dnr === "yes" ? "rov__directive--red" : ""}`}>
                  <span className="rov__directive-label">Do Not Resuscitate</span>
                  <span className="rov__directive-value">{wishes.dnr === "yes" ? "YES" : "NO"}</span>
                </div>
              )}
              {wishes.organ_donor && wishes.organ_donor !== "not_specified" && (
                <div className="rov__directive">
                  <span className="rov__directive-label">Organ Donor</span>
                  <span className="rov__directive-value">{wishes.organ_donor === "yes" ? "YES" : "NO"}</span>
                </div>
              )}
            </div>
          ) : null}

          {wishes.special_instructions && (
            <div style={{ marginTop: 16 }}>
              <span className="rov__label">Special Instructions</span>
              <p className="rov__value" style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{wishes.special_instructions}</p>
            </div>
          )}

          {wishes.religious_considerations && (
            <div style={{ marginTop: 12 }}>
              <span className="rov__label">Religious Considerations</span>
              <p className="rov__value" style={{ marginTop: 4 }}>{wishes.religious_considerations}</p>
            </div>
          )}

          {(wishes.lawyer_name || wishes.lawyer_phone) && (
            <div className="rov__doctor-card" style={{ marginTop: 16 }}>
              <span className="rov__label">Lawyer</span>
              <div className="rov__doctor-info">
                {wishes.lawyer_name && <span className="rov__value" style={{ fontWeight: 600 }}>{wishes.lawyer_name}</span>}
                {wishes.lawyer_phone && <PhoneLink number={wishes.lawyer_phone} />}
              </div>
            </div>
          )}

          {(wishes.poa_holder || wishes.poa_holder_phone) && (
            <div className="rov__doctor-card" style={{ marginTop: 12 }}>
              <span className="rov__label">Power of Attorney</span>
              <div className="rov__doctor-info">
                {wishes.poa_holder && <span className="rov__value" style={{ fontWeight: 600 }}>{wishes.poa_holder}</span>}
                {wishes.poa_holder_phone && <PhoneLink number={wishes.poa_holder_phone} />}
              </div>
            </div>
          )}
          <AttachmentGallery attachments={wishes.attachments} urls={attachmentUrls} />
        </section>
      )}

      <footer className="rov__footer">
        <p>Generated by <strong>InCaseOf</strong></p>
        <p style={{ marginTop: 4 }}>tryincaseof.com</p>
      </footer>
    </div>
  );
}
