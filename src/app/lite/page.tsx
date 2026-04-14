"use client";

import { useState, useCallback, useEffect } from "react";
import { useWizard } from "@/contexts/WizardContext";
import GoogleSignIn from "@/components/lite/GoogleSignIn";
import PinSetup from "@/components/lite/PinSetup";
import WizardShell from "@/components/lite/WizardShell";

export default function LitePage() {
  const { user, loading, loadAllData } = useWizard();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [forceReset, setForceReset] = useState(false);

  // Check for reset-pin query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset-pin") === "1") {
      setPinUnlocked(false);
      setForceReset(true);
      // Clean URL
      window.history.replaceState({}, "", "/lite");
    }
  }, []);

  const handlePinUnlocked = useCallback(() => {
    setPinUnlocked(true);
    setForceReset(false);
    loadAllData();
  }, [loadAllData]);

  if (loading) {
    return (
      <div className="signin">
        <div className="signin__card">
          <h1 className="signin__logo">InCaseOf</h1>
          <p className="signin__sub">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <GoogleSignIn />;
  }

  if (!pinUnlocked || forceReset) {
    return <PinSetup onUnlocked={handlePinUnlocked} initialMode={forceReset ? "reset" : undefined} />;
  }

  return <WizardShell />;
}
