"use client";

import { useState, useEffect } from "react";

const ACCESS_CODE_LENGTH = 8;
const LEGACY_PIN_LENGTH = 6;

interface Props {
  onUnlocked: () => void;
  initialMode?: "reset";
}

export default function PinSetup({ onUnlocked, initialMode }: Props) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [mode, setMode] = useState<"loading" | "setup" | "unlock" | "reset">(initialMode || "loading");
  const [error, setError] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialMode) return; // Skip auto-detection when mode is forced
    fetch("/api/lite/pin")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.unlocked) {
          onUnlocked();
        } else if (data.has_pin) {
          const res = await fetch("/api/lite/pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "owner_unlock" }),
          });

          if (res.ok) {
            onUnlocked();
            return;
          }

          const unlockData = await res.json().catch(() => null);
          if (unlockData?.code === "access_code_required") {
            setError("Enter your emergency access code once to finish upgrading this kit.");
          } else {
            setError(unlockData?.error || "We couldn't open your kit. Enter your emergency access code to continue.");
          }
          setMode("unlock");
        } else {
          setMode("setup");
        }
      })
      .catch(() => setMode("setup"));
  }, [onUnlocked, initialMode]);

  const cleanCode = (value: string) => value.replace(/\D/g, "").slice(0, ACCESS_CODE_LENGTH);
  const isNewAccessCode = (value: string) => value.length === ACCESS_CODE_LENGTH;
  const isUnlockCode = (value: string) =>
    value.length === ACCESS_CODE_LENGTH || value.length === LEGACY_PIN_LENGTH;

  const handleSetup = async () => {
    if (!isNewAccessCode(pin)) {
      setError("Emergency access code must be 8 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("Emergency access codes don't match");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/lite/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, action: "setup" }),
    });

    if (res.ok) {
      onUnlocked();
    } else {
      const data = await res.json().catch(() => null);
      if (data?.code === "reauth_required") {
        setNeedsReauth(true);
        setError("Google Drive permission needs to be refreshed before setup can continue.");
      } else {
        setError(data?.error || "Failed to set emergency access code. Please try again.");
      }
    }
    setSubmitting(false);
  };

  const handleUnlock = async () => {
    if (!isUnlockCode(pin)) {
      setError("Enter your 8-digit emergency access code");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/lite/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, action: "unlock" }),
    });

    if (res.ok) {
      onUnlocked();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Incorrect emergency access code");
      setPin("");
    }
    setSubmitting(false);
  };

  const handleReset = async () => {
    if (!isNewAccessCode(pin)) {
      setError("Emergency access code must be 8 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("Emergency access codes don't match");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/lite/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, action: "reset" }),
    });

    if (res.ok) {
      onUnlocked();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to change emergency access code. Please try again.");
    }
    setSubmitting(false);
  };

  if (mode === "loading") {
    return (
      <div className="signin">
        <div className="signin__card">
          <h1 className="signin__logo">InCaseOf</h1>
          <p className="signin__sub">Loading...</p>
        </div>
      </div>
    );
  }

  if (mode === "setup") {
    return (
      <div className="signin">
        <div className="signin__card">
          <h1 className="signin__logo">InCaseOf</h1>
          <h2 className="signin__title">Set your emergency access code</h2>
          <p className="signin__sub">
            Choose an 8-digit code for your emergency contact. Share it separately from the link so they can access your information when it matters.
          </p>

          <div className="pin-entry">
            <label className="wizard__label">Create Emergency Access Code</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={ACCESS_CODE_LENGTH}
              value={pin}
              onChange={(e) => { setPin(cleanCode(e.target.value)); setError(""); }}
              placeholder="--------"
              autoFocus
            />
          </div>

          <div className="pin-entry" style={{ marginTop: 16 }}>
            <label className="wizard__label">Confirm Emergency Access Code</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={ACCESS_CODE_LENGTH}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(cleanCode(e.target.value)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSetup()}
              placeholder="--------"
            />
          </div>

          {error && <p className="pin-entry__error">{error}</p>}
          {needsReauth && (
            <a
              className="signin__btn"
              href="/api/auth/google?consent=1"
              style={{ marginTop: 16 }}
            >
              Refresh Google Drive Permission
            </a>
          )}

          <button
            className="btn btn--gold"
            onClick={handleSetup}
            disabled={needsReauth || !isNewAccessCode(pin) || !isNewAccessCode(confirmPin) || submitting}
            style={{ width: "100%", marginTop: 20 }}
          >
            {submitting ? "Setting up..." : "Set Emergency Code & Continue"}
          </button>

          <p className="signin__fine">
            Passphrase option coming soon. For now, keep this emergency code separate from your share link.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="signin">
        <div className="signin__card">
          <h1 className="signin__logo">InCaseOf</h1>
          <h2 className="signin__title">Change emergency access code</h2>
          <p className="signin__sub">
            Set a new 8-digit code for your emergency contact. Your existing data will be preserved, and your emergency contact will need the new code.
          </p>

          <div className="pin-entry">
            <label className="wizard__label">New Emergency Access Code</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={ACCESS_CODE_LENGTH}
              value={pin}
              onChange={(e) => { setPin(cleanCode(e.target.value)); setError(""); }}
              placeholder="--------"
              autoFocus
            />
          </div>

          <div className="pin-entry" style={{ marginTop: 16 }}>
            <label className="wizard__label">Confirm New Emergency Access Code</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={ACCESS_CODE_LENGTH}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(cleanCode(e.target.value)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
              placeholder="--------"
            />
          </div>

          {error && <p className="pin-entry__error">{error}</p>}

          <button
            className="btn btn--gold"
            onClick={handleReset}
            disabled={!isNewAccessCode(pin) || !isNewAccessCode(confirmPin) || submitting}
            style={{ width: "100%", marginTop: 20 }}
          >
            {submitting ? "Changing..." : "Change Emergency Code"}
          </button>

          <button
            className="pin-entry__reset-link"
            onClick={() => { onUnlocked(); }}
          >
            Back to kit
          </button>

          <p className="signin__fine">
            Your data stays intact. Only the emergency code used by your share link will change.
          </p>
        </div>
      </div>
    );
  }

  // Unlock mode
  return (
    <div className="signin">
      <div className="signin__card">
        <h1 className="signin__logo">InCaseOf</h1>
        <h2 className="signin__title">Enter emergency access code</h2>
        <p className="signin__sub">
          This is only needed to upgrade older kits. After this, Google sign-in will open your kit directly. Legacy 6-digit codes still work while accounts are being upgraded.
        </p>

        <div className="pin-entry">
          <input
            className="pin-entry__input"
            type="password"
            inputMode="numeric"
            maxLength={ACCESS_CODE_LENGTH}
            value={pin}
            onChange={(e) => { setPin(cleanCode(e.target.value)); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="--------"
            autoFocus
          />
          {error && <p className="pin-entry__error">{error}</p>}
        </div>

        <button
          className="btn btn--gold"
          onClick={handleUnlock}
          disabled={!isUnlockCode(pin) || submitting}
          style={{ width: "100%", marginTop: 20 }}
        >
          {submitting ? "Opening..." : "Open Kit"}
        </button>
      </div>
    </div>
  );
}
