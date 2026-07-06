"use client";

import {
  formatStaffLoginId,
  getEmploymentTypeLabel,
  getJobTypeLabel,
  formatStaffWorkAvailability,
  type StaffMember,
} from "@/lib/staff-helpers";
import {
  formatStaffClassLabels,
  type StaffClassAssignment,
} from "@/lib/staff-class-assignment";

type StaffDetailPanelProps = {
  staff: StaffMember | null;
  classAssignment: StaffClassAssignment | null;
  onClose: () => void;
  onEdit?: () => void;
  onToggleActive?: () => void;
};

export function StaffDetailPanel({
  staff,
  classAssignment,
  onClose,
  onEdit,
  onToggleActive,
}: StaffDetailPanelProps) {
  if (!staff) {
    return null;
  }

  const employmentLabel = getEmploymentTypeLabel(staff.employment_type);
  const jobLabel = getJobTypeLabel(staff.job_type);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="staff-detail-title"
        aria-modal="true"
        className="modal-panel modal-panel--detail"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="class-detail-head">
          <div className="class-detail-head__copy">
            <span className={`class-detail-badge${staff.job_type ? "" : " is-muted"}`}>{jobLabel}</span>
            <h2 className="class-detail-title" id="staff-detail-title">
              {staff.name}
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
            <span className="class-detail-stat__label">職員ID</span>
            <span
              className={`class-detail-stat__value${
                staff.staff_id.trim() ? "" : " is-muted"
              }`}
            >
              {formatStaffLoginId(staff.staff_id)}
            </span>
          </div>
          <div className="class-detail-stat">
            <span className="class-detail-stat__label">雇用区分</span>
            <span className={`class-detail-stat__value${staff.employment_type ? "" : " is-muted"}`}>{employmentLabel}</span>
          </div>
          <div className="class-detail-stat">
            <span className="class-detail-stat__label">保育士資格</span>
            <span
              className={`class-detail-stat__value${
                staff.has_nursery_teacher_license ? "" : " is-muted"
              }`}
            >
              {staff.has_nursery_teacher_license ? "あり" : "なし"}
            </span>
          </div>
        </div>

        <section className="class-detail-block">
          <h3 className="class-detail-block__title">働ける時間</h3>
          <p
            className={`class-detail-card__value${
              formatStaffWorkAvailability(staff) ? "" : " is-muted"
            }`}
          >
            {formatStaffWorkAvailability(staff) || "未設定"}
          </p>
          {formatStaffWorkAvailability(staff) ? (
            <p className="form-field__hint">
              この時間帯内であれば早番・遅番などに配置できます。
            </p>
          ) : null}
        </section>

        <section className="class-detail-block">
          <h3 className="class-detail-block__title">担任</h3>
          <p
            className={`class-detail-card__value${
              classAssignment && formatStaffClassLabels(classAssignment) !== "未設定"
                ? ""
                : " is-muted"
            }`}
          >
            {classAssignment ? formatStaffClassLabels(classAssignment) : "未設定"}
          </p>
          <p className="form-field__hint">
            クラス管理の主担任・担任で設定したクラス名を表示します。ここでは変更できません。
          </p>
        </section>

        {(onEdit ?? onToggleActive) ? (
          <div className="class-detail-actions">
            {onEdit ? (
              <button className="primary-button" onClick={onEdit} type="button">
                編集する
              </button>
            ) : null}
            {onToggleActive ? (
              <button
                className="danger-button danger-button--outline"
                onClick={onToggleActive}
                type="button"
              >
                {staff.is_active ? "無効化" : "有効化"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

