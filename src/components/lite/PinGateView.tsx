"use client";

import { useState } from "react";
import { unwrapDEK, decryptJSONWithDEK, decryptWithDEK, decryptJSON } from "@/lib/crypto";
import { WizardProvider } from "@/contexts/WizardContext";
import WizardShell from "./WizardShell";

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

  const handleVerify = async () => {
    if (pin.length !== 6) return;
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
        setError(json.error || "Incorrect PIN. Please try again.");
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
        <h2 className="signin__title">Enter access PIN</h2>
        <p className="signin__sub">
          This emergency kit is encrypted. Enter the 6-digit PIN provided by the owner to decrypt and view their information.
        </p>
        <div className="pin-entry">
          <input
            className="pin-entry__input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="------"
            autoFocus
          />
          {error && <p className="pin-entry__error">{error}</p>}
          <button
            className="btn btn--gold"
            onClick={handleVerify}
            disabled={pin.length !== 6 || checking}
            style={{ width: "100%", marginTop: 16 }}
          >
            {checking ? "Decrypting..." : "Decrypt & View"}
          </button>
        </div>
        <p className="signin__fine">
          All decryption happens in your browser. No data is sent unencrypted over the network.
        </p>
      </div>
    </div>
  );
}
