"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { STEP_FILES, type StepFile } from "@/lib/drive/schema";

interface UserInfo {
  email: string;
  name: string;
  picture?: string;
  drive_folder_id?: string;
}

interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  data: Record<string, unknown>;
  saving: boolean;
  user: UserInfo | null;
  loading: boolean;
  readOnly: boolean;
  attachmentUrls: Record<string, string>;
}

interface WizardContextValue extends WizardState {
  goTo: (step: number) => void;
  next: () => void;
  prev: () => void;
  saveStep: (file: StepFile, data: unknown) => Promise<void>;
  loadAllData: () => Promise<void>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  readOnly?: boolean;
  initialData?: Record<string, unknown>;
  attachmentUrls?: Record<string, string>;
}

export function WizardProvider({ children, readOnly = false, initialData, attachmentUrls }: WizardProviderProps) {
  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    completedSteps: readOnly
      ? new Set(STEP_FILES.map((_, i) => i))
      : new Set(),
    data: initialData || {},
    saving: false,
    user: null,
    loading: !readOnly,
    readOnly,
    attachmentUrls: attachmentUrls || {},
  });

  // Fetch session on mount (skip in read-only mode)
  useEffect(() => {
    if (readOnly) return;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setState((s) => ({ ...s, user: data, loading: false }));
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, [readOnly]);

  const loadAllData = useCallback(async () => {
    try {
      const res = await fetch("/api/lite/drive?file=_all");
      if (!res.ok) return;
      const allData = await res.json();
      const metadata = allData["_meta"];
      const completed = new Set<number>(
        Array.isArray(metadata?.completed_steps) ? metadata.completed_steps : []
      );
      setState((s) => ({ ...s, data: allData, completedSteps: completed }));
    } catch {
      // Silently fail — user may not have folder yet
    }
  }, []);

  // Load data when user is authenticated (skip in read-only mode)
  useEffect(() => {
    if (readOnly) return;
    if (state.user) loadAllData();
  }, [state.user, loadAllData, readOnly]);

  const goTo = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: Math.max(0, Math.min(5, step)) }));
  }, []);

  const next = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.min(5, s.currentStep + 1),
    }));
  }, []);

  const prev = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.max(0, s.currentStep - 1),
    }));
  }, []);

  const saveStep = useCallback(
    async (file: StepFile, data: unknown) => {
      setState((s) => ({ ...s, saving: true }));
      try {
        const res = await fetch("/api/lite/drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file, data }),
        });
        if (res.ok) {
          const stepIndex = STEP_FILES.indexOf(file);
          setState((s) => {
            const newCompleted = new Set(s.completedSteps);
            newCompleted.add(stepIndex);
            return {
              ...s,
              data: { ...s.data, [file]: data },
              completedSteps: newCompleted,
              saving: false,
            };
          });
        } else {
          setState((s) => ({ ...s, saving: false }));
        }
      } catch {
        setState((s) => ({ ...s, saving: false }));
      }
    },
    []
  );

  return (
    <WizardContext.Provider
      value={{ ...state, goTo, next, prev, saveStep, loadAllData }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
