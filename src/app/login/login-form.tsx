"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DemoAccountSummary } from "@/lib/user-db";

type FieldErrors = {
  email?: string;
  password?: string;
};

type LoginFormProps = {
  demoAccounts: DemoAccountSummary[];
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function LoginForm({ demoAccounts }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !isSubmitting;
  }, [email, password, isSubmitting]);

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = "メールアドレスを入力してください。";
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = "メールアドレスの形式が正しくありません。";
    }

    if (!password) {
      nextErrors.password = "パスワードを入力してください。";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (response.ok) {
        router.push("/home");
        router.refresh();
        return;
      }

      setAuthError("メールアドレスまたはパスワードが正しくありません。");
    } catch {
      setAuthError("ログインに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {authError ? (
        <p className="form-alert" role="alert">
          {authError}
        </p>
      ) : null}

      <label className="form-field" htmlFor="email">
        <span>メールアドレス</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@example.com"
          value={email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {errors.email ? (
          <span className="field-error" id="email-error">
            {errors.email}
          </span>
        ) : null}
      </label>

      <label className="form-field" htmlFor="password">
        <span>パスワード</span>
        <div className="form-field__password-wrapper">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="パスワードを入力"
            value={password}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="form-field__password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password ? (
          <span className="field-error" id="password-error">
            {errors.password}
          </span>
        ) : null}
      </label>

      <button className="primary-button" type="submit" disabled={!canSubmit}>
        {isSubmitting ? "確認中..." : "ログイン"}
      </button>

      <div className="form-links">
        <a href="#">パスワードを忘れた場合</a>
        <a href="#">招待メールを再送する</a>
      </div>

      {demoAccounts.length > 0 ? (
        <section className="demo-accounts" aria-label="お試し用アカウント">
          <p className="demo-accounts-title">お試し用アカウント</p>
          <p className="demo-accounts-copy">
            パスワードはすべて <code>demo1234</code> です。
          </p>
          <ul className="demo-accounts-list">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <strong>{account.roleLabel}</strong>
                <span>{account.email}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </form>
  );
}
