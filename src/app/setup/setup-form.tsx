"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2;

type NurseryFields = {
  nurseryName: string;
  address: string;
  phoneNumber: string;
  openTime: string;
  closeTime: string;
};

type AdminFields = {
  adminName: string;
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

const TIME_PATTERN = /^\d{2}:\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateNursery(fields: NurseryFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.nurseryName.trim()) errors.nurseryName = "園名を入力してください。";
  if (!fields.openTime.trim()) {
    errors.openTime = "開園時間を入力してください。";
  } else if (!TIME_PATTERN.test(fields.openTime)) {
    errors.openTime = "HH:MM 形式で入力してください。";
  }
  if (!fields.closeTime.trim()) {
    errors.closeTime = "閉園時間を入力してください。";
  } else if (!TIME_PATTERN.test(fields.closeTime)) {
    errors.closeTime = "HH:MM 形式で入力してください。";
  }
  if (!errors.openTime && !errors.closeTime && fields.openTime >= fields.closeTime) {
    errors.closeTime = "閉園時間は開園時間より後にしてください。";
  }
  return errors;
}

function validateAdmin(fields: AdminFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.adminName.trim()) errors.adminName = "名前を入力してください。";
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
    openTime: "07:00",
    closeTime: "18:00",
  });

  const [admin, setAdmin] = useState<AdminFields>({
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: "",
  });

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
          openTime: nursery.openTime,
          closeTime: nursery.closeTime,
          adminName: admin.adminName,
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
      <form onSubmit={handleNurseryNext} noValidate>
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

        <div className="form-field-row">
          <div className="form-field-row__item">
            <label htmlFor="openTime">開園時間 <span aria-hidden="true">*</span></label>
            <input
              id="openTime"
              type="time"
              value={nursery.openTime}
              onChange={(e) => setNursery({ ...nursery, openTime: e.target.value })}
              aria-invalid={!!fieldErrors.openTime}
              required
            />
            {fieldErrors.openTime && (
              <p className="form-error" role="alert">{fieldErrors.openTime}</p>
            )}
          </div>
          <div className="form-field-row__item">
            <label htmlFor="closeTime">閉園時間 <span aria-hidden="true">*</span></label>
            <input
              id="closeTime"
              type="time"
              value={nursery.closeTime}
              onChange={(e) => setNursery({ ...nursery, closeTime: e.target.value })}
              aria-invalid={!!fieldErrors.closeTime}
              required
            />
            {fieldErrors.closeTime && (
              <p className="form-error" role="alert">{fieldErrors.closeTime}</p>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--full">
          次へ：管理者アカウント →
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="card-heading">
        <h2>管理者アカウント</h2>
        <p>ステップ 2 / 2</p>
      </div>

      {serverError && (
        <p className="form-alert" role="alert">{serverError}</p>
      )}

      <div className="form-field">
        <label htmlFor="adminName">名前 <span aria-hidden="true">*</span></label>
        <input
          id="adminName"
          type="text"
          value={admin.adminName}
          onChange={(e) => setAdmin({ ...admin, adminName: e.target.value })}
          aria-invalid={!!fieldErrors.adminName}
          placeholder="山田 花子"
          required
        />
        {fieldErrors.adminName && (
          <p className="form-error" role="alert">{fieldErrors.adminName}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="adminEmail">メールアドレス <span aria-hidden="true">*</span></label>
        <input
          id="adminEmail"
          type="email"
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
        <input
          id="adminPassword"
          type="password"
          value={admin.adminPassword}
          onChange={(e) => setAdmin({ ...admin, adminPassword: e.target.value })}
          aria-invalid={!!fieldErrors.adminPassword}
          required
        />
        {fieldErrors.adminPassword && (
          <p className="form-error" role="alert">{fieldErrors.adminPassword}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="adminPasswordConfirm">パスワード（確認） <span aria-hidden="true">*</span></label>
        <input
          id="adminPasswordConfirm"
          type="password"
          value={admin.adminPasswordConfirm}
          onChange={(e) => setAdmin({ ...admin, adminPasswordConfirm: e.target.value })}
          aria-invalid={!!fieldErrors.adminPasswordConfirm}
          required
        />
        {fieldErrors.adminPasswordConfirm && (
          <p className="form-error" role="alert">{fieldErrors.adminPasswordConfirm}</p>
        )}
      </div>

      <div className="setup-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => { setFieldErrors({}); setStep(1); }}
          disabled={submitting}
        >
          ← 戻る
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "セットアップ中..." : "セットアップ完了"}
        </button>
      </div>
    </form>
  );
}
