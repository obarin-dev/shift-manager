import { notFound } from "next/navigation";
import { getInvitationByToken } from "@/lib/invitation-db";
import { RegisterForm } from "./register-form";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function RegisterPage({ params }: Props) {
  const { token } = await params;

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  if (invitation.status !== "pending") {
    return (
      <main className="login-page">
        <section className="login-hero" aria-labelledby="register-title">
          <p className="eyebrow">保育園向け勤務表管理システム</p>
          <h1 id="register-title">Shift Manager</h1>
        </section>

        <section className="login-card" aria-label="招待エラー">
          <div className="card-heading">
            <h2>招待リンクが無効です</h2>
            <p>
              {invitation.status === "used"
                ? "この招待リンクはすでに使用されています。"
                : invitation.status === "disabled"
                ? "この招待リンクは無効化されています。"
                : "この招待リンクの有効期限が切れています。"}
              管理者に新しい招待リンクを発行してもらってください。
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="register-title">
        <p className="eyebrow">保育園向け勤務表管理システム</p>
        <h1 id="register-title">Shift Manager</h1>
        <p className="hero-copy">アカウントを作成してログインしてください。</p>
      </section>

      <section className="login-card" aria-label="アカウント作成フォーム">
        <div className="card-heading">
          <h2>アカウント作成</h2>
          <p>
            ログインに使うメールアドレスとパスワードを設定してください。
          </p>
        </div>

        <RegisterForm staffName={invitation.staffName} token={token} />
      </section>
    </main>
  );
}
