import { listDemoAccountsForLogin } from "@/lib/user-db";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  let demoAccounts: Awaited<ReturnType<typeof listDemoAccountsForLogin>> = [];

  try {
    demoAccounts = await listDemoAccountsForLogin();
  } catch {
    demoAccounts = [];
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="login-title">
        <p className="eyebrow">保育園向け勤務表管理システム</p>
        <h1 id="login-title">Shift Manager</h1>
        <p className="hero-copy">
          希望休や配置基準をふまえて、勤務表作成をもっと簡単に。
        </p>
      </section>

      <section className="login-card" aria-label="ログインフォーム">
        <div className="card-heading">
          <h2>アカウントにログイン</h2>
          <p>
            園コードは不要です。招待済みのメールアドレスとパスワードでログインしてください。
          </p>
        </div>

        <LoginForm demoAccounts={demoAccounts} />
      </section>
    </main>
  );
}
