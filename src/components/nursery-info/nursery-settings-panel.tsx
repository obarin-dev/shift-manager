"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  formatDisplayTime,
  formatExtendedCareRange,
  validateNurseryHours,
  validateShiftTypeTimes,
  isWorkShiftType,
  type NurseryProfile,
  type ShiftTypeDefinition,
} from "@/lib/nursery-helpers";
import { ShiftTypeInlineRow } from "@/components/nursery-info/shift-type-inline-row";
import {
  DEFAULT_SHIFT_TYPE_COLOR,
  getDefaultColorForShiftCode,
  normalizeShiftColor,
} from "@/lib/shift-type-colors";
import { NurseryRestDaysSection } from "@/components/nursery-info/nursery-rest-days-section";
import { SectionEditPencilButton } from "@/components/nursery-info/section-edit-pencil-button";

function toTimeInputValue(time: string) {
  return time;
}

function normalizeShiftType(shift: ShiftTypeDefinition): ShiftTypeDefinition {
  return {
    ...shift,
    color:
      normalizeShiftColor(shift.color) ??
      getDefaultColorForShiftCode(shift.code) ??
      DEFAULT_SHIFT_TYPE_COLOR,
  };
}

function draftsFromShiftTypes(shiftTypes: ShiftTypeDefinition[]) {
  return Object.fromEntries(
    shiftTypes.map((shift) => [shift.id, normalizeShiftType(shift)]),
  );
}

export function NurserySettingsPanel({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [profile, setProfile] = useState<NurseryProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<NurseryProfile | null>(null);
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof NurseryProfile, string>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isEditingRestDays, setIsEditingRestDays] = useState(false);

  const [shiftTypes, setShiftTypes] = useState<ShiftTypeDefinition[]>([]);
  const [shiftTypeDrafts, setShiftTypeDrafts] = useState<
    Record<string, ShiftTypeDefinition>
  >({});
  const [savingShiftTypeId, setSavingShiftTypeId] = useState<string | null>(null);
  const [newShiftTypeDraft, setNewShiftTypeDraft] =
    useState<ShiftTypeDefinition | null>(null);

  const workShiftTypes = useMemo(
    () => shiftTypes.filter(isWorkShiftType),
    [shiftTypes],
  );

  const sortedWorkShiftTypes = useMemo(() => {
    return [...workShiftTypes].sort((a, b) => a.sort_order - b.sort_order);
  }, [workShiftTypes]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const [profileResponse, shiftTypesResponse] = await Promise.all([
        apiFetch("/api/nursery/profile"),
        apiFetch("/api/shift-types"),
      ]);

      const profileBody = (await profileResponse.json()) as {
        data?: NurseryProfile;
      };
      const shiftTypesBody = (await shiftTypesResponse.json()) as {
        data?: ShiftTypeDefinition[];
      };

      if (profileResponse.ok && profileBody.data) {
        setProfile(profileBody.data);
        setProfileDraft(profileBody.data);
      }

      if (shiftTypesResponse.ok) {
        const loaded = (shiftTypesBody.data ?? []).map(normalizeShiftType);
        setShiftTypes(loaded);
        setShiftTypeDrafts(draftsFromShiftTypes(loaded));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleProfileSave = async (
    section: "basic" | "hours",
  ): Promise<boolean> => {
    if (!profileDraft) {
      return false;
    }

    setProfileSaveError(null);

    if (section === "hours") {
      const nextErrors = validateNurseryHours(profileDraft);
      setProfileErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return false;
      }
    } else {
      setProfileErrors({});
      if (!profileDraft.name.trim()) {
        window.alert("園名を入力してください。");
        return false;
      }
    }

    setIsSavingProfile(true);

    try {
      const response = await apiFetch("/api/nursery/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileDraft),
      });
      const body = (await response.json()) as { data?: NurseryProfile };

      if (!response.ok || !body.data) {
        const message = "園情報の保存に失敗しました。";
        setProfileSaveError(message);
        window.alert(message);
        return false;
      }

      setProfile(body.data);
      setProfileDraft(body.data);
      setProfileSaveError(null);
      window.alert("園情報を保存しました。");

      if (section === "basic") {
        setIsEditingBasic(false);
      } else {
        setIsEditingHours(false);
      }

      return true;
    } catch {
      const message = "園情報の保存に失敗しました。";
      setProfileSaveError(message);
      window.alert(message);
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const cancelBasicEdit = () => {
    if (!profile) {
      return;
    }

    setProfileDraft((current) =>
      current
        ? {
            ...current,
            name: profile.name,
            address: profile.address,
            phone_number: profile.phone_number,
          }
        : current,
    );
    setIsEditingBasic(false);
  };

  const cancelHoursEdit = () => {
    if (!profile) {
      return;
    }

    setProfileDraft((current) =>
      current
        ? {
            ...current,
            open_time: profile.open_time,
            close_time: profile.close_time,
            extended_close_time: profile.extended_close_time,
          }
        : current,
    );
    setProfileErrors({});
    setProfileSaveError(null);
    setIsEditingHours(false);
  };

  const updateShiftTypeDraft = (id: string, draft: ShiftTypeDefinition) => {
    setShiftTypeDrafts((current) => ({ ...current, [id]: draft }));
  };

  const saveShiftType = async (
    draft: ShiftTypeDefinition,
    isNew: boolean,
  ): Promise<boolean> => {
    if (!profile || !draft.name.trim()) {
      return false;
    }

    const timeErrors = validateShiftTypeTimes(draft, profile);
    if (Object.keys(timeErrors).length > 0) {
      window.alert(Object.values(timeErrors).join("\n"));
      return false;
    }

    const payload = {
      code: draft.code,
      name: draft.name.trim(),
      start: draft.start,
      end: draft.end,
      is_active: draft.is_active,
      sort_order: draft.sort_order,
      color:
        normalizeShiftColor(draft.color) ??
        getDefaultColorForShiftCode(draft.code) ??
        DEFAULT_SHIFT_TYPE_COLOR,
    };

    setSavingShiftTypeId(draft.id);

    try {
      const response = await apiFetch(
        isNew ? "/api/shift-types" : `/api/shift-types/${draft.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as {
        data?: ShiftTypeDefinition;
        message?: string;
      };

      if (!response.ok || !body.data) {
        window.alert(
          body.message ??
            (isNew ? "勤務区分の追加に失敗しました。" : "勤務区分の保存に失敗しました。"),
        );
        return false;
      }

      const saved = normalizeShiftType(body.data);

      if (isNew) {
        setShiftTypes((current) => [...current, saved]);
        setShiftTypeDrafts((current) => ({
          ...current,
          [saved.id]: saved,
        }));
        setNewShiftTypeDraft(null);
      } else {
        setShiftTypes((current) =>
          current.map((s) => (s.id === saved.id ? saved : s)),
        );
        setShiftTypeDrafts((current) => ({
          ...current,
          [saved.id]: saved,
        }));
      }

      window.alert("勤務区分を保存しました。");
      return true;
    } catch {
      window.alert(
        isNew ? "勤務区分の追加に失敗しました。" : "勤務区分の保存に失敗しました。",
      );
      return false;
    } finally {
      setSavingShiftTypeId(null);
    }
  };

  const openShiftTypeCreate = () => {
    if (!profile) {
      return;
    }

    setNewShiftTypeDraft({
      id: `new-${Date.now()}`,
      code: "other",
      name: "新しい勤務区分",
      start: profile.open_time,
      end: profile.close_time,
      is_active: true,
      sort_order: Math.max(...workShiftTypes.map((s) => s.sort_order), 0) + 1,
      color: DEFAULT_SHIFT_TYPE_COLOR,
    });
  };

  if (isLoading || !profileDraft || !profile) {
    return <p className="classes-panel__count">読み込み中…</p>;
  }

  return (
    <div className="nursery-info-settings-stack">
      {/* 園の基本情報 */}
      <details className="nursery-info-details" open>
        <summary className="nursery-info-details__summary">
          <span>園の基本情報</span>
        </summary>
        <section className="classes-panel" aria-label="園の基本情報">
          {!isEditingBasic && !readOnly ? (
            <div className="nursery-info-details__toolbar">
              <SectionEditPencilButton onClick={() => setIsEditingBasic(true)} />
            </div>
          ) : null}

          {!isEditingBasic || readOnly ? (
            <div className="nursery-info-readonly-grid">
              <div className="nursery-info-readonly-grid__row">
                <p className="nursery-info-readonly-grid__label">園名</p>
                <p className="nursery-info-readonly-grid__value">{profile.name}</p>
              </div>
              <div className="nursery-info-readonly-grid__row">
                <p className="nursery-info-readonly-grid__label">所在地</p>
                <p className="nursery-info-readonly-grid__value">
                  {profile.address || "未設定"}
                </p>
              </div>
              <div className="nursery-info-readonly-grid__row">
                <p className="nursery-info-readonly-grid__label">電話番号</p>
                <p className="nursery-info-readonly-grid__value">
                  {profile.phone_number || "未設定"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="form-field-row">
                <label className="form-field">
                  <span>園名</span>
                  <input
                    value={profileDraft.name}
                    onChange={(e) =>
                      setProfileDraft((cur) =>
                        cur
                          ? {
                              ...cur,
                              name: e.target.value,
                            }
                          : cur,
                      )
                    }
                  />
                </label>
                <label className="form-field">
                  <span>所在地</span>
                  <input
                    value={profileDraft.address}
                    onChange={(e) =>
                      setProfileDraft((cur) =>
                        cur
                          ? {
                              ...cur,
                              address: e.target.value,
                            }
                          : cur,
                      )
                    }
                  />
                </label>
              </div>

              <div className="form-field-row">
                <label className="form-field">
                  <span>電話番号</span>
                  <input
                    value={profileDraft.phone_number}
                    onChange={(e) =>
                      setProfileDraft((cur) =>
                        cur
                          ? {
                              ...cur,
                              phone_number: e.target.value,
                            }
                          : cur,
                      )
                    }
                  />
                </label>
              </div>

              <div className="nursery-section-form__actions">
                <button
                  className="secondary-button secondary-button--compact"
                  type="button"
                  disabled={isSavingProfile}
                  onClick={cancelBasicEdit}
                >
                  キャンセル
                </button>
                <button
                  className="primary-button primary-button--compact"
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => void handleProfileSave("basic")}
                >
                  {isSavingProfile ? "保存中…" : "変更を保存"}
                </button>
              </div>
            </>
          )}
        </section>
      </details>

      {/* 保育時間 */}
      <details className="nursery-info-details" open>
        <summary className="nursery-info-details__summary">
          <span>保育時間</span>
        </summary>
        <section className="classes-panel" aria-label="保育時間">
          {!isEditingHours && !readOnly ? (
            <div className="nursery-info-details__toolbar">
              <SectionEditPencilButton onClick={() => setIsEditingHours(true)} />
            </div>
          ) : null}

          <p style={{ margin: "0 0 12px", color: "var(--muted)", fontWeight: 600 }}>
            通常保育は開園〜閉園。延長保育は閉園のあと〜終了時刻までです。
          </p>

          {!isEditingHours || readOnly ? (
            <div className="nursery-info-readonly-grid">
              <div className="nursery-info-readonly-grid__row">
                <p className="nursery-info-readonly-grid__label">通常保育</p>
                <p className="nursery-info-readonly-grid__value">
                  {formatDisplayTime(profile.open_time)} 〜{" "}
                  {formatDisplayTime(profile.close_time)}
                </p>
              </div>
              <div className="nursery-info-readonly-grid__row">
                <p className="nursery-info-readonly-grid__label">延長保育</p>
                <p className="nursery-info-readonly-grid__value">
                  {formatExtendedCareRange(
                    profile.close_time,
                    profile.extended_close_time,
                  )}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="form-field-row">
                <label className="form-field">
                  <span>開園時間</span>
                  <input
                    type="time"
                    aria-invalid={Boolean(profileErrors.open_time)}
                    value={toTimeInputValue(profileDraft.open_time)}
                    onChange={(e) =>
                      setProfileDraft((cur) =>
                        cur
                          ? {
                              ...cur,
                              open_time: e.target.value,
                            }
                          : cur,
                      )
                    }
                  />
                  {profileErrors.open_time ? (
                    <small>{profileErrors.open_time}</small>
                  ) : null}
                </label>

                <label className="form-field">
                  <span>閉園時間</span>
                  <input
                    type="time"
                    aria-invalid={Boolean(profileErrors.close_time)}
                    value={toTimeInputValue(profileDraft.close_time)}
                    onChange={(e) =>
                      setProfileDraft((cur) =>
                        cur
                          ? {
                              ...cur,
                              close_time: e.target.value,
                            }
                          : cur,
                      )
                    }
                  />
                  {profileErrors.close_time ? (
                    <small>{profileErrors.close_time}</small>
                  ) : null}
                </label>
              </div>

              <div
                style={{
                  marginTop: 4,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(217, 224, 234, 0.75)",
                }}
              >
                <p style={{ margin: "0 0 6px", fontWeight: 800 }}>延長保育</p>
                <p
                  style={{
                    margin: "0 0 12px",
                    color: "var(--muted)",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  閉園後に延長保育を受け付ける場合、終了時刻を閉園より後に設定してください。
                </p>
                <div className="form-field-row">
                  <label className="form-field">
                    <span>開始（閉園と同じ）</span>
                    <input
                      type="time"
                      disabled
                      value={toTimeInputValue(profileDraft.close_time)}
                      aria-describedby="extended-care-hint"
                    />
                  </label>
                  <label className="form-field">
                    <span>終了</span>
                    <input
                      type="time"
                      aria-invalid={Boolean(profileErrors.extended_close_time)}
                      value={toTimeInputValue(profileDraft.extended_close_time)}
                      onChange={(e) =>
                        setProfileDraft((cur) =>
                          cur
                            ? {
                                ...cur,
                                extended_close_time: e.target.value,
                              }
                            : cur,
                        )
                      }
                    />
                    {profileErrors.extended_close_time ? (
                      <small>{profileErrors.extended_close_time}</small>
                    ) : null}
                  </label>
                </div>
                <p
                  id="extended-care-hint"
                  style={{
                    margin: "8px 0 0",
                    color: "var(--muted)",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                  }}
                >
                  設定例: 閉園 18:00 → 延長終了 19:00（18:00 〜 19:00 が延長保育）
                </p>
              </div>

              {profileSaveError ? (
                <p style={{ color: "var(--danger)", marginTop: 8 }}>{profileSaveError}</p>
              ) : null}

              <div className="nursery-section-form__actions">
                <button
                  className="secondary-button secondary-button--compact"
                  type="button"
                  disabled={isSavingProfile}
                  onClick={cancelHoursEdit}
                >
                  キャンセル
                </button>
                <button
                  className="primary-button primary-button--compact"
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => void handleProfileSave("hours")}
                >
                  {isSavingProfile ? "保存中…" : "変更を保存"}
                </button>
              </div>
            </>
          )}
        </section>
      </details>

      {/* 休日設定 */}
      <details className="nursery-info-details" open>
        <summary className="nursery-info-details__summary">
          <span>休日設定</span>
        </summary>
        <NurseryRestDaysSection
          isEditing={isEditingRestDays}
          onIsEditingChange={setIsEditingRestDays}
          readOnly={readOnly}
        />
      </details>

      {/* 勤務区分 */}
      <details className="nursery-info-details" open>
        <summary className="nursery-info-details__summary">
          <span>勤務区分マスタ</span>
        </summary>
        <section className="classes-panel" aria-label="勤務区分マスタ">
          <p style={{ margin: "0 0 12px", color: "var(--muted)", fontWeight: 600 }}>
            早番・日勤・遅番などの勤務区分と勤務表の表示色を管理します（延長保育は「保育時間」で設定）
          </p>

          <div className="classes-panel__toolbar">
            <p className="classes-panel__count">
              勤務区分：{sortedWorkShiftTypes.length}件
            </p>
            {!readOnly ? (
              <button
                className="primary-button"
                type="button"
                disabled={newShiftTypeDraft !== null}
                onClick={openShiftTypeCreate}
              >
                区分を追加
              </button>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {sortedWorkShiftTypes.map((shift) => {
              const draft = shiftTypeDrafts[shift.id] ?? shift;

              return (
                <ShiftTypeInlineRow
                  key={shift.id}
                  saved={shift}
                  draft={draft}
                  profile={profile}
                  isSaving={savingShiftTypeId === shift.id}
                  readOnly={readOnly}
                  onChange={(next) => updateShiftTypeDraft(shift.id, next)}
                  onSave={() => saveShiftType(draft, false)}
                />
              );
            })}

            {newShiftTypeDraft ? (
              <ShiftTypeInlineRow
                saved={newShiftTypeDraft}
                draft={newShiftTypeDraft}
                profile={profile}
                isNew
                isSaving={savingShiftTypeId === newShiftTypeDraft.id}
                onChange={setNewShiftTypeDraft}
                onCancel={() => setNewShiftTypeDraft(null)}
                onSave={() => saveShiftType(newShiftTypeDraft, true)}
              />
            ) : null}
          </div>
        </section>
      </details>
    </div>
  );
}
