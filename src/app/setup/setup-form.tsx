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

type Step = 1 | 2;

type NurseryFields = {
  nurseryName: string;
  address: string;
  phoneNumber: string;
};

type AdminFields = {
  adminLastName: string;
  adminFirstName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
};

type FieldErrors = Partial<Record<keyof NurseryFields | keyof AdminFields, string>>;


const ERROR_MESSAGES: Record<string, string> = {
  invalid_payload: "入力内容を確認してください。",
  already_setup: "セットアップはすでに完了しています。ログインしてください。",
  internal_error: "サーバーエラーが発生しました。しばらくしてから再度お試しください。",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateNursery(fields: NurseryFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.nurseryName.trim()) errors.nurseryName = "園名を入力してください。";
  return errors;
}

function validateAdmin(fields: AdminFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.adminLastName.trim()) errors.adminLastName = "姓を入力してください。";
  if (fields.adminLastName.trim().length > 25) errors.adminLastName = "姓は25文字以内で入力してください。";
  if (fields.adminFirstName.trim().length > 25) errors.adminFirstName = "名は25文字以内で入力してください。";
  if (!fields.adminEmail.trim()) {
    errors.adminEmail = "メールアドレスを入力してください。";
  } else if (!EMAIL_PATTERN.test(fields.adminEmail.trim())) {
    errors.adminEmail = "メールアドレスの形式が正しくありません。";
  }
  if (!fields.adminPassword) {
    errors.adminPassword = "パスワードを入力してください。";
  } else if (fields.adminPassword.length < 8) {
    errors.adminPassword = "パスワードは8文字以上で入力してください。";
  }
  if (fields.adminPassword !== fields.adminPasswordConfirm) {
    errors.adminPasswordConfirm = "パスワードが一致しません。";
  }
  return errors;
}

export function SetupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [nursery, setNursery] = useState<NurseryFields>({
    nurseryName: "",
    address: "",
    phoneNumber: "",
  });

  const [admin, setAdmin] = useState<AdminFields>({
    adminLastName: "",
    adminFirstName: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleNurseryNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateNursery(nursery);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const errors = validateAdmin(admin);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nurseryName: nursery.nurseryName,
          address: nursery.address,
          phoneNumber: nursery.phoneNumber,
          adminLastName: admin.adminLastName,
          adminFirstName: admin.adminFirstName,
          adminEmail: admin.adminEmail,
          adminPassword: admin.adminPassword,
        }),
      });

      const body = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setServerError(ERROR_MESSAGES[body.error ?? ""] ?? ERROR_MESSAGES.internal_error);
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setServerError(ERROR_MESSAGES.internal_error);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={handleNurseryNext} noValidate className="login-form">
        <div className="card-heading">
          <h2>園の基本情報</h2>
          <p>ステップ 1 / 2</p>
        </div>

        <div className="form-field">
          <label htmlFor="nurseryName">園名 <span aria-hidden="true">*</span></label>
          <input
            id="nurseryName"
            type="text"
            value={nursery.nurseryName}
            onChange={(e) => setNursery({ ...nursery, nurseryName: e.target.value })}
            aria-invalid={!!fieldErrors.nurseryName}
            placeholder="星の子保育園"
            required
          />
          {fieldErrors.nurseryName && (
            <p className="form-error" role="alert">{fieldErrors.nurseryName}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="address">住所</label>
          <input
            id="address"
            type="text"
            value={nursery.address}
            onChange={(e) => setNursery({ ...nursery, address: e.target.value })}
            placeholder="東京都世田谷区..."
          />
        </div>

        <div className="form-field">
          <label htmlFor="phoneNumber">電話番号</label>
          <input
            id="phoneNumber"
            type="tel"
            value={nursery.phoneNumber}
            onChange={(e) => setNursery({ ...nursery, phoneNumber: e.target.value })}
            placeholder="03-0000-0000"
          />
        </div>

        <button type="submit" className="primary-button">
          次へ：管理者アカウント →
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="login-form">
      <div className="card-heading">
        <h2>管理者アカウント</h2>
        <p>ステップ 2 / 2</p>
      </div>

      {serverError && (
        <p className="form-alert" role="alert">{serverError}</p>
      )}

      <div className="modal-form__grid">
        <div className="form-field">
          <label htmlFor="adminLastName">姓 <span aria-hidden="true">*</span></label>
          <input
            id="adminLastName"
            type="text"
            value={admin.adminLastName}
            onChange={(e) => setAdmin({ ...admin, adminLastName: e.target.value })}
            aria-invalid={!!fieldErrors.adminLastName}
            placeholder="山田"
            required
          />
          {fieldErrors.adminLastName && (
            <p className="form-error" role="alert">{fieldErrors.adminLastName}</p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="adminFirstName">名</label>
          <input
            id="adminFirstName"
            type="text"
            value={admin.adminFirstName}
            onChange={(e) => setAdmin({ ...admin, adminFirstName: e.target.value })}
            aria-invalid={!!fieldErrors.adminFirstName}
            placeholder="花子"
          />
          {fieldErrors.adminFirstName && (
            <p className="form-error" role="alert">{fieldErrors.adminFirstName}</p>
          )}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="adminEmail">メールアドレス <span aria-hidden="true">*</span></label>
        <input
          id="adminEmail"
          type="email"
          autoComplete="off"
          value={admin.adminEmail}
          onChange={(e) => setAdmin({ ...admin, adminEmail: e.target.value })}
          aria-invalid={!!fieldErrors.adminEmail}
          placeholder="admin@example.com"
          required
        />
        {fieldErrors.adminEmail && (
          <p className="form-error" role="alert">{fieldErrors.adminEmail}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="adminPassword">パスワード <span aria-hidden="true">*</span></label>
        <div className="form-field__password-wrapper">
          <input
            id="adminPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={admin.adminPassword}
            onChange={(e) => setAdmin({ ...admin, adminPassword: e.target.value })}
            aria-invalid={!!fieldErrors.adminPassword}
            required
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
        {fieldErrors.adminPassword && (
          <p className="form-error" role="alert">{fieldErrors.adminPassword}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="adminPasswordConfirm">パスワード（確認） <span aria-hidden="true">*</span></label>
        <div className="form-field__password-wrapper">
          <input
            id="adminPasswordConfirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={admin.adminPasswordConfirm}
            onChange={(e) => setAdmin({ ...admin, adminPasswordConfirm: e.target.value })}
            aria-invalid={!!fieldErrors.adminPasswordConfirm}
            required
          />
          <button
            type="button"
            className="form-field__password-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "パスワードを隠す" : "パスワードを表示"}
            tabIndex={-1}
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {fieldErrors.adminPasswordConfirm && (
          <p className="form-error" role="alert">{fieldErrors.adminPasswordConfirm}</p>
        )}
      </div>

      <div className="setup-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => { setFieldErrors({}); setStep(1); }}
          disabled={submitting}
        >
          ← 戻る
        </button>
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "セットアップ中..." : "セットアップ完了"}
        </button>
      </div>
    </form>
  );
}
