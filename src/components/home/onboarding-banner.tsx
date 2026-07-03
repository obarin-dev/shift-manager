"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const STEP_GUIDE: Record<string, string> = {
  shiftTypes: "早番・遅番など、園で使う勤務区分を登録してください。",
  holidaySettings: "定休日・祝日の休園設定をしてください。",
  staff: "スタッフを1名以上登録してください。",
  classes: "クラスを1つ以上作成してください。",
};

function BannerContent() {
  const params = useSearchParams();
  if (params.get("from") !== "onboarding") return null;

  const step = params.get("step") ?? "";
  const guide = STEP_GUIDE[step] ?? "初期設定を続けてください。";

  return (
    <div className="onboarding-banner" role="note">
      <div className="onboarding-banner__body">
        <span className="onboarding-banner__badge">初期設定ガイド</span>
        <span className="onboarding-banner__guide">{guide}</span>
      </div>
      <a href="/home" className="onboarding-banner__back">
        ← ホームに戻る
      </a>
    </div>
  );
}

export function OnboardingBanner() {
  return (
    <Suspense fallback={null}>
      <BannerContent />
    </Suspense>
  );
}
