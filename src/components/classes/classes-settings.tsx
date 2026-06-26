"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  classroomToFormValues,
  emptyClassroomFormValues,
  getAgeGroupLabel,
  normalizeAuxiliarySlots,
  normalizeStaffAssignment,
  sortClassrooms,
  type Classroom,
  type ClassroomFormValues,
} from "@/lib/classroom-helpers";
import { useStaffList } from "@/hooks/use-staff-list";
import { ClassDeleteDialog } from "@/components/classes/class-delete-dialog";
import { ClassDetailPanel } from "@/components/classes/class-detail-panel";
import { ClassFormModal } from "@/components/classes/class-form-modal";
type ModalState =
  | { type: "create" }
  | { type: "edit"; classroomId: string }
  | null;

export function ClassesSettings({ readOnly = false }: { readOnly?: boolean }) {
  const { staff, isLoading: staffLoading, getStaffName, getStaffNames } =
    useStaffList();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);

  const loadClassrooms = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/classrooms");
      const body = (await response.json()) as { data?: Classroom[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "load_failed");
      }

      setClassrooms(
        (body.data ?? []).map((classroom) => ({
          ...classroom,
          auxiliarySlots: classroom.auxiliarySlots ?? [],
          otherStaffIds: classroom.otherStaffIds ?? [],
        })),
      );
    } catch {
      setLoadError("クラス一覧の取得に失敗しました。ページを再読み込みしてください。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClassrooms();
  }, [loadClassrooms]);

  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);
  const detailClassroom = detailId
    ? classrooms.find((classroom) => classroom.id === detailId) ?? null
    : null;

  const editingClassroom =
    modalState?.type === "edit"
      ? classrooms.find((classroom) => classroom.id === modalState.classroomId)
      : undefined;

  const handleSave = async (values: ClassroomFormValues) => {
    const staff = normalizeStaffAssignment(values.mainStaffId, values.otherStaffIds);
    const payload = {
      name: values.name.trim(),
      ageGroup: values.ageGroup as Classroom["ageGroup"],
      childCount: Number(values.childCount),
      auxiliarySlots: normalizeAuxiliarySlots(values.auxiliarySlots),
      mainStaffId: staff.mainStaffId,
      otherStaffIds: staff.otherStaffIds,
      note: values.note.trim(),
    };

    setSaveError(null);

    const isEdit = modalState?.type === "edit" && editingClassroom;
    const url = isEdit ? `/api/classrooms/${editingClassroom.id}` : "/api/classrooms";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        data?: Classroom;
        error?: string;
      };

      if (!response.ok) {
        if (body.error === "duplicate_name") {
          setSaveError("同じクラス名が既に登録されています。");
          return;
        }

        if (body.error === "invalid_staff") {
          setSaveError(
            "選択した職員はまだ登録されていません。担任・担当は空のまま保存するか、職員管理で登録してください。",
          );
          return;
        }

        throw new Error(body.error ?? "save_failed");
      }

      if (body.data) {
        const saved = {
          ...body.data,
          auxiliarySlots: body.data.auxiliarySlots ?? [],
          otherStaffIds: body.data.otherStaffIds ?? [],
        };

        setClassrooms((current) => {
          if (isEdit) {
            return current.map((classroom) =>
              classroom.id === saved.id ? saved : classroom,
            );
          }

          return [...current, saved];
        });
      } else {
        await loadClassrooms();
      }

      setModalState(null);
    } catch {
      setSaveError("クラスの保存に失敗しました。もう一度お試しください。");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      const response = await fetch(`/api/classrooms/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("delete_failed");
      }

      setClassrooms((current) =>
        current.filter((classroom) => classroom.id !== deleteTarget.id),
      );

      if (detailId === deleteTarget.id) {
        setDetailId(null);
      }

      setDeleteTarget(null);
    } catch {
      setLoadError("クラスの削除に失敗しました。もう一度お試しください。");
      setDeleteTarget(null);
    }
  };

  const openEdit = (classroom: Classroom) => {
    setDetailId(null);
    setModalState({ type: "edit", classroomId: classroom.id });
  };

  return (
    <>
      <section
        className="classes-panel classes-panel--scroll-body"
        aria-label="クラス一覧"
      >
        <div className="classes-panel__fixed">
          <div className="classes-panel__toolbar">
            <p className="classes-panel__count">
              クラス数：{sortedClassrooms.length}件
            </p>
            {!readOnly ? (
              <button
                className="primary-button"
                onClick={() => setModalState({ type: "create" })}
                type="button"
              >
                クラスを追加
              </button>
            ) : null}
          </div>
        </div>

        <div className="classes-panel__scroll-region">
          {loadError ? (
            <div className="classes-empty">
              <p>{loadError}</p>
            </div>
          ) : null}
          {isLoading ? (
            <div className="classes-empty">
              <p>読み込み中…</p>
            </div>
          ) : null}
          {!isLoading && !loadError && sortedClassrooms.length === 0 ? (
            <div className="classes-empty">
              <h2>クラスがまだ登録されていません</h2>
              <p>クラスを追加すると、勤務表・体制表作成で利用できます。</p>
              {!readOnly ? (
                <button
                  className="primary-button"
                  onClick={() => setModalState({ type: "create" })}
                  type="button"
                >
                  クラスを追加
                </button>
              ) : null}
            </div>
          ) : !isLoading && !loadError ? (
            <div className="classes-table-wrap classes-table-wrap--large">
              <table className="classes-table classes-table--large">
                <thead>
                  <tr>
                    <th scope="col">クラス名</th>
                    <th scope="col">年齢区分</th>
                    <th scope="col">園児数</th>
                    <th scope="col">主担任</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClassrooms.map((classroom) => (
                    <tr key={classroom.id}>
                      <td>
                        <button
                          className="classes-table__name-link"
                          onClick={() => setDetailId(classroom.id)}
                          type="button"
                        >
                          {classroom.name}
                        </button>
                      </td>
                      <td>{getAgeGroupLabel(classroom.ageGroup)}</td>
                      <td className="classes-table__number">
                        {classroom.childCount}名
                      </td>
                      <td>{getStaffName(classroom.mainStaffId) ?? "未設定"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      {saveError ? (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <ClassDetailPanel
        classroom={detailClassroom}
        getStaffName={getStaffName}
        getStaffNames={getStaffNames}
        onClose={() => setDetailId(null)}
        onDelete={readOnly ? undefined : () => {
          if (detailClassroom) {
            setDeleteTarget(detailClassroom);
          }
        }}
        onEdit={readOnly ? undefined : () => {
          if (detailClassroom) {
            openEdit(detailClassroom);
          }
        }}
      />

      <ClassFormModal
        classrooms={classrooms}
        staffMembers={staff}
        staffLoading={staffLoading}
        editingId={editingClassroom?.id}
        initialValues={
          editingClassroom
            ? classroomToFormValues(editingClassroom)
            : emptyClassroomFormValues()
        }
        mode={modalState?.type === "edit" ? "edit" : "create"}
        onClose={() => setModalState(null)}
        onSave={(values) => {
          void handleSave(values);
        }}
        open={modalState !== null}
      />

      <ClassDeleteDialog
        classroom={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
