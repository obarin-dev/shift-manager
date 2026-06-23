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

export function LoginForm({ demoAccounts }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="パスワードを入力"
          value={password}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
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
