"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";

const DISMISSED_KEY = "setup-complete-dismissed";

export function SetupCompleteModal() {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) !== "1") {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }, []);

  useModalA11y({ ref: panelRef, isOpen: visible, onClose: dismiss });

  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div
        ref={panelRef}
        className="modal-panel onboarding-modal onboarding-modal--complete"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-complete-title"
      >
        <button type="button" className="modal-panel__close" aria-label="ダイアログを閉じる" onClick={dismiss}>
          ✕
        </button>
        <div className="onboarding-complete">
          <div className="onboarding-complete__icon">
            <svg fill="none" height="40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="onboarding-complete__title" id="setup-complete-title">
            初期設定が完了しました！
          </h2>
          <p className="onboarding-complete__desc">さっそくシフト表の作成を始めましょう。</p>
          <div className="onboarding-complete__actions">
            <a href="/shifts" className="primary-button">シフト表を作成する →</a>
            <button type="button" className="secondary-button" onClick={dismiss}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}
