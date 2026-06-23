"use client";

import {
  getAgeGroupLabel,
  type Classroom,
} from "@/lib/mock-classes";
type ClassDetailPanelProps = {
  classroom: Classroom | null;
  getStaffName: (id: string | null | undefined) => string | null;
  getStaffNames: (ids: string[] | null | undefined) => string[];
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export function ClassDetailPanel({
  classroom,
  getStaffName,
  getStaffNames,
  onClose,
  onDelete,
  onEdit,
}: ClassDetailPanelProps) {
  if (!classroom) {
    return null;
  }

  const mainStaffName = getStaffName(classroom.mainStaffId);
  const otherStaffNames = getStaffNames(classroom.otherStaffIds);
  const ageLabel = getAgeGroupLabel(classroom.ageGroup);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="class-detail-title"
        aria-modal="true"
        className="modal-panel modal-panel--detail"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="class-detail-head">
          <div className="class-detail-head__copy">
            <span className="class-detail-badge">{ageLabel}</span>
            <h2 className="class-detail-title" id="class-detail-title">
              {classroom.name}
            </h2>
          </div>
          <button
            aria-label="閉じる"
            className="modal-panel__close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="class-detail-stats">
          <div className="class-detail-stat">
            <span className="class-detail-stat__label">年齢区分</span>
            <span className="class-detail-stat__value">{ageLabel}</span>
          </div>
          <div className="class-detail-stat">
            <span className="class-detail-stat__label">園児数</span>
            <span className="class-detail-stat__value">{classroom.childCount}名</span>
          </div>
        </div>

        <section aria-labelledby="class-detail-staff-title" className="class-detail-block">
          <h3 className="class-detail-block__title" id="class-detail-staff-title">
            担当職員
          </h3>

          <div className="class-detail-card">
            <span className="class-detail-card__label">主担任</span>
            <p
              className={`class-detail-card__value${mainStaffName ? "" : " is-muted"}`}
            >
              {mainStaffName ?? "未設定"}
            </p>
          </div>

          <div className="class-detail-card">
            <span className="class-detail-card__label">担任</span>
            {otherStaffNames.length > 0 ? (
              <ul className="class-detail-tags">
                {otherStaffNames.map((name) => (
                  <li className="class-detail-tag" key={name}>
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="class-detail-card__value is-muted">未設定</p>
            )}
          </div>

          <div className="class-detail-card">
            <span className="class-detail-card__label">補助の人数</span>
            {(classroom.auxiliarySlots ?? []).length > 0 ? (
              <ul className="class-detail-auxiliary-list">
                {(classroom.auxiliarySlots ?? []).map((slot) => (
                  <li className="class-detail-auxiliary-list__item" key={slot.id}>
                    {slot.count}人 · {slot.time}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="class-detail-card__value is-muted">未設定</p>
            )}
          </div>
        </section>

        {classroom.note ? (
          <section
            aria-labelledby="class-detail-note-title"
            className="class-detail-block class-detail-block--note"
          >
            <h3 className="class-detail-block__title" id="class-detail-note-title">
              補足メモ
            </h3>
            <p className="class-detail-note">{classroom.note}</p>
          </section>
        ) : null}

        <div className="class-detail-actions">
          <button className="primary-button" onClick={onEdit} type="button">
            編集する
          </button>
          <button
            className="danger-button danger-button--outline"
            onClick={onDelete}
            type="button"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
