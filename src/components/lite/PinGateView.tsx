"use client";

import { useState } from "react";
import { unwrapDEK, decryptJSONWithDEK, decryptWithDEK, decryptJSON } from "@/lib/crypto";
import { WizardProvider } from "@/contexts/WizardContext";
import WizardShell from "./WizardShell";

const ACCESS_CODE_LENGTH = 8;
const LEGACY_PIN_LENGTH = 6;

interface Props {
  folderId: string;
}

type ViewData = Record<string, unknown>;

export default function PinGateView({ folderId }: Props) {
  const [pin, setPin] = useState("");
  const [data, setData] = useState<ViewData | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const cleanCode = (value: string) => value.replace(/\D/g, "").slice(0, ACCESS_CODE_LENGTH);
  const isAccessCodeLength = (value: string) =>
    value.length === ACCESS_CODE_LENGTH || value.length === LEGACY_PIN_LENGTH;

  const handleVerify = async () => {
    if (!isAccessCodeLength(pin)) return;
    setChecking(true);
    setError("");

    try {
      const res = await fetch("/api/lite/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, pin }),
      });

      const json = await res.json();

      if (!res.ok || !json.valid) {
        setError(json.error || "Incorrect access code. Please try again.");
        setPin("");
        setChecking(false);
        return;
      }

      const { salt, wrapped_dek, files } = json as {
        salt: string;
        wrapped_dek: string | null;
        files: Record<string, string>;
      };

      const decrypted: ViewData = {};
      const attUrls: Record<string, string> = {};

      if (wrapped_dek) {
        // v2: unwrap DEK then decrypt with it
        const dek = await unwrapDEK(wrapped_dek, pin, salt);
        for (const [key, encrypted] of Object.entries(files)) {
          try {
            if (key.startsWith("att_")) {
              // Attachment: decrypt as binary, create blob URL
              const buffer = await decryptWithDEK(encrypted, dek);
              const blob = new Blob([buffer]);
              attUrls[key] = URL.createObjectURL(blob);
            } else {
              const parsed = await decryptJSONWithDEK(encrypted, dek);
              (decrypted as Record<string, unknown>)[key] = parsed;
            }
          } catch {
            // Skip files that fail to decrypt
          }
        }
      } else {
        // v1 legacy: decrypt with PIN + salt directly
        for (const [key, encrypted] of Object.entries(files)) {
          try {
            if (!key.startsWith("att_")) {
              const parsed = await decryptJSON(encrypted, pin, salt);
              (decrypted as Record<string, unknown>)[key] = parsed;
            }
          } catch {
            // Skip files that fail to decrypt
          }
        }
      }

      setData(decrypted);
      setAttachmentUrls(attUrls);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setChecking(false);
  };

  if (data) {
    return (
      <WizardProvider readOnly initialData={data} attachmentUrls={attachmentUrls}>
        <WizardShell />
      </WizardProvider>
    );
  }

  return (
    <div className="signin">
      <div className="signin__card">
        <h1 className="signin__logo">InCaseOf</h1>
        <h2 className="signin__title">Enter access code</h2>
        <p className="signin__sub">
          This emergency kit is protected. Enter the 8-digit access code provided by the owner to view their information.
        </p>
        <div className="pin-entry">
          <input
            className="pin-entry__input"
            type="password"
            inputMode="numeric"
            maxLength={ACCESS_CODE_LENGTH}
            value={pin}
            onChange={(e) => {
              setPin(cleanCode(e.target.value));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="--------"
            autoFocus
          />
          {error && <p className="pin-entry__error">{error}</p>}
          <button
            className="btn btn--gold"
            onClick={handleVerify}
            disabled={!isAccessCodeLength(pin) || checking}
            style={{ width: "100%", marginTop: 16 }}
          >
            {checking ? "Decrypting..." : "Decrypt & View"}
          </button>
        </div>
        <p className="signin__fine">
          Legacy 6-digit codes still work while accounts are being upgraded.
        </p>
      </div>
    </div>
  );
}
