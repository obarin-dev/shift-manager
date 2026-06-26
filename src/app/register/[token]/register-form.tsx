"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  staffName: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "メールアドレスとパスワードを入力してください。",
  password_too_short: "パスワードは8文字以上で入力してください。",
  password_mismatch: "パスワードが一致しません。",
  invitation_invalid: "この招待リンクは使用済みまたは期限切れです。",
  email_already_used: "このメールアドレスはすでに使用されています。ログインページからログインするか、管理者にお問い合わせください。",
  server_error: "サーバーエラーが発生しました。しばらくしてから再度お試しください。",
};

export function RegisterForm({ token, staffName }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError(ERROR_MESSAGES.password_mismatch);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/invitations/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setError(ERROR_MESSAGES[body.error ?? ""] ?? ERROR_MESSAGES.server_error);
        return;
      }

      router.push("/home");
    } catch {
      setError(ERROR_MESSAGES.server_error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      {staffName ? (
        <p className="form-field__hint">対象の職員: {staffName}</p>
      ) : null}

      <label className="form-field" htmlFor="register-email">
        <span>メールアドレス</span>
        <input
          autoComplete="email"
          disabled={submitting}
          id="register-email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="例: yamada@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="form-field" htmlFor="register-password">
        <span>パスワード（8文字以上）</span>
        <input
          autoComplete="new-password"
          disabled={submitting}
          id="register-password"
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <label className="form-field" htmlFor="register-confirm">
        <span>パスワード（確認）</span>
        <input
          autoComplete="new-password"
          disabled={submitting}
          id="register-confirm"
          minLength={8}
          onChange={(e) => setConfirm(e.target.value)}
          required
          type="password"
          value={confirm}
        />
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="modal-form__actions">
        <button
          className="primary-button"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "登録中…" : "アカウントを作成"}
        </button>
      </div>
    </form>
  );
}
