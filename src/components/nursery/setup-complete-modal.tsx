"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "setup-complete-dismissed";

export function SetupCompleteModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) !== "1") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel onboarding-modal onboarding-modal--complete">
        <button type="button" className="modal-panel__close" aria-label="閉じる" onClick={dismiss}>
          ✕
        </button>
        <div className="onboarding-complete">
          <div className="onboarding-complete__icon">
            <svg fill="none" height="40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="onboarding-complete__title">初期設定が完了しました！</h2>
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
