"use client";

import { useWizard } from "@/contexts/WizardContext";
import { STEP_LABELS, STEP_FILES } from "@/lib/drive/schema";
import AboutYou from "./steps/AboutYou";
import Health from "./steps/Health";
import Insurance from "./steps/Insurance";
import People from "./steps/People";
import Documents from "./steps/Documents";
import Wishes from "./steps/Wishes";

const STEP_COMPONENTS = [AboutYou, Health, Insurance, People, Documents, Wishes];

export default function WizardShell() {
  const { currentStep, completedSteps, goTo, user, readOnly } = useWizard();
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className={`wizard ${readOnly ? "wizard--readonly" : ""}`}>
      <div className="wizard__sidebar">
        {readOnly ? (
          <div className="wizard__user">
            <div>
              <div className="wizard__user-name wizard__user-name--brand">InCaseOf</div>
              <div className="wizard__user-email">Emergency Information</div>
            </div>
          </div>
        ) : (
          <div className="wizard__user">
            {user?.picture && (
              <img src={user.picture} alt="" className="wizard__avatar" referrerPolicy="no-referrer" />
            )}
            <div>
              <div className="wizard__user-name">{user?.name}</div>
              <div className="wizard__user-email">{user?.email}</div>
            </div>
          </div>
        )}

        <nav className="wizard__nav">
          {STEP_FILES.map((file, i) => {
            const isActive = i === currentStep;
            const isComplete = completedSteps.has(i);
            return (
              <button
                key={file}
                className={`wizard__nav-item ${isActive ? "wizard__nav-item--active" : ""} ${isComplete ? "wizard__nav-item--done" : ""}`}
                onClick={() => goTo(i)}
              >
                <span className="wizard__nav-num">
                  {isComplete ? "✓" : `0${i + 1}`}
                </span>
                <span className="wizard__nav-label">
                  {STEP_LABELS[file]}
                </span>
              </button>
            );
          })}
        </nav>

        {!readOnly && (
          <div className="wizard__sidebar-footer">
            <a href="/lite?reset-pin=1" className="wizard__logout">
              Reset PIN
            </a>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="wizard__logout">
                Sign out
              </button>
            </form>
          </div>
        )}

        {readOnly && (
          <div className="wizard__sidebar-footer">
            <p className="wizard__readonly-note">
              All decryption happens in your browser.
            </p>
          </div>
        )}
      </div>

      <div className="wizard__main">
        <StepComponent />
      </div>
    </div>
  );
}
