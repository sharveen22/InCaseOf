"use client";

import { useRef, useState } from "react";
import type { Attachment } from "@/lib/drive/schema";
import { MAX_UPLOAD_SIZE, ALLOWED_MIME_TYPES } from "@/lib/drive/schema";

interface Props {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("word")) return "📝";
  if (mime.startsWith("video/")) return "🎬";
  return "📎";
}

export default function FileUpload({ attachments, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setError("");
    setUploading(true);

    for (const file of Array.from(files)) {
      // Client-side validation
      if (file.size > MAX_UPLOAD_SIZE) {
        setError(`"${file.name}" is too large (${formatSize(file.size)}). Max ${formatSize(MAX_UPLOAD_SIZE)}.`);
        continue;
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(`"${file.name}" type not supported. Use images, PDFs, Word docs, or videos.`);
        continue;
      }

      const attachmentId = generateId();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("attachmentId", attachmentId);

      try {
        const res = await fetch("/api/lite/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          const att: Attachment = {
            id: attachmentId,
            drive_file_id: result.fileId,
            name: file.name,
            mime: file.type,
            size: file.size,
          };
          onChange([...attachments, att]);
        } else {
          const errData = await res.json();
          setError(errData.error || "Upload failed");
        }
      } catch {
        setError("Upload failed. Check your connection and try again.");
      }
    }

    setUploading(false);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (att: Attachment) => {
    try {
      await fetch("/api/lite/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId: att.id }),
      });
      onChange(attachments.filter((a) => a.id !== att.id));
    } catch {
      setError("Failed to delete file");
    }
  };

  return (
    <div className="upload">
      <div className="upload__header">
        <span className="upload__title">Attachments</span>
        <button
          type="button"
          className="upload__btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "+ Upload file"}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="upload__hidden"
          accept={ALLOWED_MIME_TYPES.join(",")}
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {error && <p className="upload__error">{error}</p>}

      {attachments.length > 0 && (
        <div className="upload__list">
          {attachments.map((att) => (
            <div key={att.id} className="upload__item">
              <span className="upload__icon">{getFileIcon(att.mime)}</span>
              <div className="upload__info">
                <span className="upload__name">{att.name}</span>
                <span className="upload__size">{formatSize(att.size)}</span>
              </div>
              <button
                type="button"
                className="upload__delete"
                onClick={() => handleDelete(att)}
                title="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
