"use client";

import type { Attachment } from "@/lib/drive/schema";

interface Props {
  attachments: Attachment[];
  attachmentUrls: Record<string, string>;
}

function getFileIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("word")) return "📝";
  if (mime.startsWith("video/")) return "🎬";
  return "📎";
}

export default function AttachmentViewer({ attachments, attachmentUrls }: Props) {
  if (!attachments.length) return null;

  // Filter to only attachments that have a blob URL available
  const available = attachments.filter((att) => attachmentUrls[`att_${att.id}`]);
  if (!available.length) return null;

  return (
    <div className="att-viewer">
      <span className="att-viewer__title">Attachments</span>
      <div className="att-viewer__grid">
        {available.map((att) => {
          const url = attachmentUrls[`att_${att.id}`];
          const isImage = att.mime.startsWith("image/");
          const isVideo = att.mime.startsWith("video/");

          if (isImage) {
            return (
              <a key={att.id} href={url} target="_blank" rel="noopener noreferrer" className="att-viewer__item att-viewer__item--image">
                <img src={url} alt={att.name} className="att-viewer__img" />
                <span className="att-viewer__name">{att.name}</span>
              </a>
            );
          }

          if (isVideo) {
            return (
              <div key={att.id} className="att-viewer__item att-viewer__item--video">
                <video src={url} controls className="att-viewer__vid" />
                <span className="att-viewer__name">{att.name}</span>
              </div>
            );
          }

          return (
            <a key={att.id} href={url} download={att.name} className="att-viewer__item att-viewer__item--file">
              <span className="att-viewer__icon">{getFileIcon(att.mime)}</span>
              <span className="att-viewer__name">{att.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
