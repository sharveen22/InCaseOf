"use client";

import { useState, useEffect } from "react";

interface Props {
  onUnlocked: () => void;
  initialMode?: "reset";
}

export default function PinSetup({ onUnlocked, initialMode }: Props) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [mode, setMode] = useState<"loading" | "setup" | "unlock" | "reset">(initialMode || "loading");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialMode) return; // Skip auto-detection when mode is forced
    fetch("/api/lite/pin")
      .then((r) => r.json())
      .then((data) => {
        if (data.unlocked) {
          onUnlocked();
        } else if (data.has_pin) {
          setMode("unlock");
        } else {
          setMode("setup");
        }
      })
      .catch(() => setMode("setup"));
  }, [onUnlocked, initialMode]);

  const handleSetup = async () => {
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
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
      setError("Failed to set PIN. Please try again.");
    }
    setSubmitting(false);
  };

  const handleUnlock = async () => {
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
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
      setError("Incorrect PIN");
      setPin("");
    }
    setSubmitting(false);
  };

  const handleReset = async () => {
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
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
      setError("Failed to reset PIN. Please try again.");
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
          <h2 className="signin__title">Set your encryption PIN</h2>
          <p className="signin__sub">
            Choose a 6-digit PIN to encrypt your emergency data. Everything stored on Google Drive will be protected by this PIN. Share it with your emergency contact so they can access your info.
          </p>

          <div className="pin-entry">
            <label className="wizard__label">Create PIN</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder="------"
              autoFocus
            />
          </div>

          <div className="pin-entry" style={{ marginTop: 16 }}>
            <label className="wizard__label">Confirm PIN</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSetup()}
              placeholder="------"
            />
          </div>

          {error && <p className="pin-entry__error">{error}</p>}

          <button
            className="btn btn--gold"
            onClick={handleSetup}
            disabled={pin.length !== 6 || confirmPin.length !== 6 || submitting}
            style={{ width: "100%", marginTop: 20 }}
          >
            {submitting ? "Setting up..." : "Set PIN & Continue"}
          </button>

          <p className="signin__fine">
            This PIN encrypts all your data. Without it, nobody (including me) can read your information on Google Drive.
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
          <h2 className="signin__title">Reset your PIN</h2>
          <p className="signin__sub">
            Set a new 6-digit PIN. Your existing data will be preserved. Your emergency contact will need your new PIN.
          </p>

          <div className="pin-entry">
            <label className="wizard__label">New PIN</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder="------"
              autoFocus
            />
          </div>

          <div className="pin-entry" style={{ marginTop: 16 }}>
            <label className="wizard__label">Confirm New PIN</label>
            <input
              className="pin-entry__input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
              placeholder="------"
            />
          </div>

          {error && <p className="pin-entry__error">{error}</p>}

          <button
            className="btn btn--gold"
            onClick={handleReset}
            disabled={pin.length !== 6 || confirmPin.length !== 6 || submitting}
            style={{ width: "100%", marginTop: 20 }}
          >
            {submitting ? "Resetting..." : "Reset PIN"}
          </button>

          <button
            className="pin-entry__reset-link"
            onClick={() => { setMode("unlock"); setPin(""); setConfirmPin(""); setError(""); }}
          >
            Back to unlock
          </button>

          <p className="signin__fine">
            Your data stays intact. Only the PIN used to access it will change.
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
        <h2 className="signin__title">Enter your PIN</h2>
        <p className="signin__sub">
          Enter your 6-digit PIN to decrypt your emergency kit.
        </p>

        <div className="pin-entry">
          <input
            className="pin-entry__input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="------"
            autoFocus
          />
          {error && <p className="pin-entry__error">{error}</p>}
        </div>

        <button
          className="btn btn--gold"
          onClick={handleUnlock}
          disabled={pin.length !== 6 || submitting}
          style={{ width: "100%", marginTop: 20 }}
        >
          {submitting ? "Unlocking..." : "Unlock"}
        </button>

        <button
          className="pin-entry__reset-link"
          onClick={() => { setMode("reset"); setPin(""); setConfirmPin(""); setError(""); }}
        >
          Forgot your PIN?
        </button>
      </div>
    </div>
  );
}
