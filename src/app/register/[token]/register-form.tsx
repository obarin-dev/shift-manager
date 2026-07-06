"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

function EyeIcon() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" x2="23" y1="1" y2="23" />
    </svg>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

      const body = (await response.json()) as { ok?: boolean; error?: string; autoLogin?: boolean; role?: string };

      if (!response.ok) {
        setError(ERROR_MESSAGES[body.error ?? ""] ?? ERROR_MESSAGES.server_error);
        return;
      }

      if (body.autoLogin === true) {
        const dest = body.role === "admin" || body.role === "manager" ? "/nursery" : "/home";
        router.push(dest);
      } else {
        router.push("/login?registered=1");
      }
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
        <div className="form-field__password-wrapper">
          <input
            autoComplete="new-password"
            disabled={submitting}
            id="register-password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            className="form-field__password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            type="button"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </label>

      <label className="form-field" htmlFor="register-confirm">
        <span>パスワード（確認）</span>
        <div className="form-field__password-wrapper">
          <input
            autoComplete="new-password"
            disabled={submitting}
            id="register-confirm"
            minLength={8}
            onChange={(e) => setConfirm(e.target.value)}
            required
            type={showConfirm ? "text" : "password"}
            value={confirm}
          />
          <button
            aria-label={showConfirm ? "パスワードを隠す" : "パスワードを表示"}
            className="form-field__password-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            tabIndex={-1}
            type="button"
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
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
