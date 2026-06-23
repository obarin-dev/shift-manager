"use client";

import type { Classroom } from "@/lib/mock-classes";

type ClassDeleteDialogProps = {
  classroom: Classroom | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ClassDeleteDialog({
  classroom,
  onCancel,
  onConfirm,
}: ClassDeleteDialogProps) {
  if (!classroom) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        aria-labelledby="class-delete-title"
        aria-modal="true"
        className="modal-panel modal-panel--compact"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <div className="modal-panel__header">
          <h2 id="class-delete-title">クラスを削除しますか？</h2>
        </div>

        <p className="modal-panel__message">
          「{classroom.name}」を削除します。この操作は取り消せません。
        </p>

        <div className="modal-form__actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            キャンセル
          </button>
          <button className="danger-button" onClick={onConfirm} type="button">
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
