import { redirect } from "next/navigation";
import { isSetupRequired } from "@/lib/setup-db";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  let setupRequired = true;
  try {
    setupRequired = await isSetupRequired();
  } catch {
    // DB 未接続時はフォームを表示（エラーはフォーム送信時に検知）
  }

  if (!setupRequired) {
    redirect("/login");
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="setup-title">
        <p className="eyebrow">保育園向け勤務表管理システム</p>
        <h1 id="setup-title">Shift Manager</h1>
        <p className="hero-copy">初回セットアップ</p>
      </section>

      <section className="login-card setup-card" aria-label="初回セットアップ">
        <SetupForm />
      </section>
    </main>
  );
}
