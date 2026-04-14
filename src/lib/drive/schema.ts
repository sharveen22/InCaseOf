// --- Attachments (shared across all sections) ---

export interface Attachment {
  id: string; // unique ID, matches filename att_<id>.enc on Drive
  drive_file_id?: string; // Google Drive file ID for the encrypted blob
  name: string; // original filename
  mime: string; // e.g. image/png, application/pdf, video/mp4
  size: number; // bytes
}

// --- Section data types ---

export interface AboutYouData {
  full_name: string;
  preferred_name?: string;
  date_of_birth: string;
  blood_type: string;
  nationality: string;
  languages: string[];
  address?: string;
  phone?: string;
  attachments?: Attachment[];
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface HealthData {
  conditions: string[];
  medications: Medication[];
  allergies: string[];
  doctor_name?: string;
  doctor_phone?: string;
  hospital_preference?: string;
  notes?: string;
  attachments?: Attachment[];
}

export interface InsuranceEntry {
  type: "travel" | "health" | "life";
  provider: string;
  policy_number: string;
  emergency_line?: string;
  expiry_date?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  notes?: string;
}

export interface InsuranceData {
  policies: InsuranceEntry[];
  attachments?: Attachment[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
  share_level: "full" | "medical_only" | "notify_only";
  notes?: string;
}

export interface PeopleData {
  contacts: EmergencyContact[];
  attachments?: Attachment[];
}

export interface DocumentRef {
  type: "passport" | "drivers_license" | "national_id" | "other";
  label: string;
  number: string;
  country?: string;
  expiry_date?: string;
}

export interface DocumentsData {
  documents: DocumentRef[];
  attachments?: Attachment[];
}

export interface WishesData {
  dnr: "yes" | "no" | "not_specified";
  organ_donor: "yes" | "no" | "not_specified";
  religious_considerations?: string;
  special_instructions?: string;
  lawyer_name?: string;
  lawyer_phone?: string;
  poa_holder?: string;
  poa_holder_phone?: string;
  attachments?: Attachment[];
}

// --- Metadata (UNENCRYPTED on Drive) ---

export interface MetadataFile {
  salt: string; // random salt for PIN key derivation
  pin_check: string; // encrypted known string to verify PIN
  wrapped_dek: string; // DEK encrypted with PIN-derived key
  recovery_dek: string; // DEK encrypted with recovery key (email + server secret)
  created_at: string;
  updated_at: string;
  completed_steps: number[];
  version: number;
}

// --- Step definitions ---

export type StepFile =
  | "about-you"
  | "health"
  | "insurance"
  | "people"
  | "documents"
  | "wishes";

export type StepDataMap = {
  "about-you": AboutYouData;
  health: HealthData;
  insurance: InsuranceData;
  people: PeopleData;
  documents: DocumentsData;
  wishes: WishesData;
};

export const STEP_FILES: StepFile[] = [
  "about-you",
  "health",
  "insurance",
  "people",
  "documents",
  "wishes",
];

export const STEP_LABELS: Record<StepFile, string> = {
  "about-you": "About You",
  health: "Health",
  insurance: "Insurance",
  people: "My People",
  documents: "Documents",
  wishes: "Wishes",
};

// Max file upload size: 50MB
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
