"use client";

import { useState, useEffect, type FormEvent } from "react";

type OnboardingStatus = {
  nursingHours: boolean;
  shiftTypes: boolean;
  holidaySettings: boolean;
  staff: boolean;
  classes: boolean;
};

type StepId = keyof OnboardingStatus;

const STEPS: {
  id: StepId;
  title: string;
  href?: string;
  desc?: string;
}[] = [
  { id: "nursingHours", title: "保育時間を設定する" },
  {
    id: "shiftTypes",
    title: "勤務区分マスタを登録する",
    href: "/nursery/settings?from=onboarding&step=shiftTypes",
    desc: "園で使う勤務区分（例：早番・遅番など）を登録します。",
  },
  {
    id: "holidaySettings",
    title: "休日設定をする",
    href: "/nursery/settings?from=onboarding&step=holidaySettings",
    desc: "定休曜日や祝日の休園設定をします。",
  },
  {
    id: "staff",
    title: "最初の職員を登録する",
    href: "/nursery/staff?from=onboarding&step=staff",
    desc: "スタッフを1名以上登録します。シフト作成に必要です。",
  },
  {
    id: "classes",
    title: "最初のクラスを登録する",
    href: "/nursery/classes?from=onboarding&step=classes",
    desc: "クラスを1つ以上作成します。体制表の作成に必要です。",
  },
];

function CheckIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

async function fetchStatus(): Promise<OnboardingStatus | null> {
  try {
    const res = await fetch("/api/onboarding/status");
    if (!res.ok) return null;
    return (await res.json()) as OnboardingStatus;
  } catch {
    return null;
  }
}

// ── Step 1 のみインライン ──────────────────────────────────
function NursingHoursForm({ onDone }: { onDone: () => void }) {
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [extendedCloseTime, setExtendedCloseTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentProfile, setCurrentProfile] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch("/api/nursery/profile")
      .then((r) => r.json())
      .then((result) => {
        const data = result?.data ?? {};
        setCurrentProfile(data);
        if (data?.open_time) setOpenTime(data.open_time);
        if (data?.close_time) setCloseTime(data.close_time);
        if (data?.extended_close_time) setExtendedCloseTime(data.extended_close_time);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!openTime || !closeTime) {
      setError("開園・閉園時間を入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/nursery/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentProfile,
          open_time: openTime,
          close_time: closeTime,
          extended_close_time: extendedCloseTime,
        }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setError("保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="form-field-row">
        <div className="form-field-row__item">
          <label htmlFor="ob-open-time">開園時間 <span aria-hidden="true">*</span></label>
          <input id="ob-open-time" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} required />
        </div>
        <div className="form-field-row__item">
          <label htmlFor="ob-close-time">閉園時間 <span aria-hidden="true">*</span></label>
          <input id="ob-close-time" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} required />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="ob-extended-time">延長保育終了時間（任意）</label>
        <input id="ob-extended-time" type="time" value={extendedCloseTime} onChange={(e) => setExtendedCloseTime(e.target.value)} />
      </div>
      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? "保存中..." : "保存して次へ"}
      </button>
    </form>
  );
}

// ── ページ遷移ボタン（Step 2〜5）────────────────────────────
function StepPageLink({ href, desc }: { href: string; desc: string }) {
  return (
    <div className="onboarding-step-link">
      <p className="onboarding-step__note">{desc}</p>
      <a href={href} className="primary-button onboarding-step-link__btn">
        ページへ移動する →
      </a>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
const SESSION_KEY = "onboarding-dismissed";

export function OnboardingModal() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId | null>(null);

  const load = async () => {
    const s = await fetchStatus();
    setStatus(s);
    if (s) {
      const allDone = STEPS.every((step) => s[step.id]);
      if (allDone) {
        const isDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
        setDismissed(isDismissed);
        return;
      }
      const isDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
      setDismissed(isDismissed);
      if (!isDismissed) {
        const first = STEPS.find((step) => !s[step.id]);
        setActiveStep(first?.id ?? null);
      }
    }
  };

  useEffect(() => { load(); }, []);

  if (!status || dismissed) return null;

  const allDone = STEPS.every((step) => status[step.id]);

  if (allDone) {
    return (
      <div className="modal-backdrop">
        <div className="modal-panel onboarding-modal onboarding-modal--complete">
          <button
            type="button"
            className="modal-panel__close"
            aria-label="閉じる"
            onClick={() => { sessionStorage.setItem(SESSION_KEY, "1"); setDismissed(true); }}
          >
            ✕
          </button>
          <div className="onboarding-complete">
            <div className="onboarding-complete__icon">
              <svg fill="none" height="40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="onboarding-complete__title">初期設定が完了しました！</h2>
            <p className="onboarding-complete__desc">
              さっそくシフト表の作成を始めましょう。
            </p>
            <div className="onboarding-complete__actions">
              <a href="/shifts" className="primary-button">
                シフト表を作成する →
              </a>
              <button
                type="button"
                className="secondary-button"
                onClick={() => { sessionStorage.setItem(SESSION_KEY, "1"); setDismissed(true); }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel onboarding-modal">
        <div className="modal-panel__header">
          <h2>初期設定を完了しましょう</h2>
          <button type="button" className="modal-panel__close" aria-label="閉じる" onClick={() => { sessionStorage.setItem(SESSION_KEY, "1"); setDismissed(true); }}>
            ✕
          </button>
        </div>

        <div className="onboarding-steps">
          {STEPS.map((step, index) => {
            const done = status[step.id];
            const isActive = activeStep === step.id;

            return (
              <div key={step.id} className={`onboarding-step${done ? " onboarding-step--done" : ""}${isActive ? " onboarding-step--active" : ""}`}>
                <button
                  type="button"
                  className="onboarding-step__header"
                  onClick={() => !done && setActiveStep(isActive ? null : step.id)}
                  disabled={done}
                >
                  <span className="onboarding-step__number">
                    {done ? <CheckIcon /> : index + 1}
                  </span>
                  <span className="onboarding-step__label">{step.title}</span>
                </button>

                {isActive && !done && (
                  <div className="onboarding-step__body">
                    {step.href ? (
                      <StepPageLink href={step.href} desc={step.desc!} />
                    ) : (
                      <NursingHoursForm onDone={load} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
