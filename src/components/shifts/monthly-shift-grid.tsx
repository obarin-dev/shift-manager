"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClassroomsList } from "@/hooks/use-classrooms-list";
import { useShiftTypesList } from "@/hooks/use-shift-types-list";
import { useStaffList } from "@/hooks/use-staff-list";
import { useHolidaySettings } from "@/hooks/use-holiday-settings";
import {
  buildAssignmentMap,
  buildMonthDateKeys,
  formatDateHeader,
  formatTargetMonthLabel,
  getAssignmentForCell,
  getCurrentTargetMonth,
  getStaffSurname,
  parseTargetMonth,
  shiftTargetMonth,
  type ShiftAssignment,
  type ShiftCellValue,
  type ShiftScheduleStatus,
} from "@/lib/shift-helpers";
import { ShiftScheduleLegend } from "@/components/shifts/shift-schedule-legend";
import { useAdminStaffRequests } from "@/hooks/use-admin-staff-requests";
import { mergeStaffRequestsIntoAssignments } from "@/lib/staff-request-shift-mapper";
import {
  buildShiftCellOptions,
  buildShiftLegendItems,
  getShiftCellClassName,
  getShiftCellDisplayLabel,
  getShiftCellInlineStyle,
  normalizeShiftCellValue,
  SHIFT_CELL_OFF,
} from "@/lib/shift-schedule-options";
import {
  getClosedDayForDate,
  getPublicHolidayForDate,
  isClosedDate,
} from "@/lib/holiday-settings";
import { buildShiftScheduleClassSections } from "@/lib/shift-schedule-class-sections";

type MonthlyShiftGridProps = {
  nurseryName?: string;
  readOnly?: boolean;
  className?: string;
};

export function MonthlyShiftGrid({
  nurseryName = "保育園",
  readOnly = false,
  className,
}: MonthlyShiftGridProps) {
  const { staff, isLoading: isStaffLoading, error: staffError } = useStaffList();
  const {
    classrooms,
    isLoading: isClassroomsLoading,
    error: classroomsError,
  } = useClassroomsList();
  const {
    shiftTypes,
    isLoading: isShiftTypesLoading,
    error: shiftTypesError,
  } = useShiftTypesList();
  const { settings: holidaySettings } = useHolidaySettings();
  const [targetMonth, setTargetMonth] = useState(() => getCurrentTargetMonth());
  const {
    groups: staffRequestGroups,
    isLoading: isStaffRequestsLoading,
    error: staffRequestsError,
  } = useAdminStaffRequests(targetMonth, !readOnly);

  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavedSchedule, setIsSavedSchedule] = useState(false);
  const [hasDraftEdits, setHasDraftEdits] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<ShiftScheduleStatus | null>(null);
  const loadedMonthRef = useRef<string | null>(null);
  const requestsAppliedRef = useRef<string | null>(null);

  const { year, month } = useMemo(() => parseTargetMonth(targetMonth), [targetMonth]);

  const shiftTypeById = useMemo(
    () => new Map(shiftTypes.map((shift) => [shift.id, shift])),
    [shiftTypes],
  );

  const cellOptions = useMemo(() => buildShiftCellOptions(shiftTypes), [shiftTypes]);

  const legendItems = useMemo(() => buildShiftLegendItems(shiftTypes), [shiftTypes]);

  const staffRows = useMemo(
    () =>
      [...staff]
        .filter((member) => member.is_active)
        .sort((left, right) => left.staff_id.localeCompare(right.staff_id)),
    [staff],
  );

  const staffIds = useMemo(() => staffRows.map((member) => member.id), [staffRows]);
  const staffById = useMemo(
    () => new Map(staffRows.map((member) => [member.id, member])),
    [staffRows],
  );
  const classSections = useMemo(
    () => buildShiftScheduleClassSections(classrooms, staff),
    [classrooms, staff],
  );

  const dateKeys = useMemo(() => buildMonthDateKeys(year, month), [year, month]);
  const assignmentMap = useMemo(() => buildAssignmentMap(assignments), [assignments]);

  const applyRequestsToAssignments = useCallback(
    (rows: ShiftAssignment[]) => {
      if (staffRequestGroups.length === 0) {
        return rows;
      }
      return mergeStaffRequestsIntoAssignments(rows, staffRequestGroups, shiftTypes);
    },
    [staffRequestGroups, shiftTypes],
  );

  const normalizeAssignments = useCallback(
    (rows: ShiftAssignment[]) =>
      rows.map((row) => ({
        ...row,
        shift_type:
          normalizeShiftCellValue(row.shift_type, shiftTypes) ?? row.shift_type,
      })),
    [shiftTypes],
  );

  const applyClosedDayOff = useCallback(
    (rows: ShiftAssignment[]) => {
      const closedDateKeys = new Set(
        dateKeys.filter((dateKey) => isClosedDate(dateKey, holidaySettings)),
      );
      if (closedDateKeys.size === 0) {
        return rows;
      }

      const map = new Map<string, ShiftAssignment>();
      for (const row of rows) {
        map.set(`${row.staff_id}:${row.work_date}`, row);
      }

      for (const staffId of staffIds) {
        for (const dateKey of closedDateKeys) {
          map.set(`${staffId}:${dateKey}`, {
            staff_id: staffId,
            work_date: dateKey,
            shift_type: SHIFT_CELL_OFF,
          });
        }
      }

      return Array.from(map.values());
    },
    [dateKeys, holidaySettings, staffIds],
  );

  useEffect(() => {
    if (shiftTypes.length === 0 || staffIds.length === 0) {
      return;
    }

    let active = true;
    const loadSchedule = async () => {
      setIsLoadingSchedule(true);
      setSaveMessage("");
      loadedMonthRef.current = null;

      try {
        const params = new URLSearchParams({ month: targetMonth });
        if (readOnly) {
          params.set("published", "true");
        }

        const response = await fetch(`/api/shift-schedules?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("load_failed");
        }

        const body = (await response.json()) as {
          data: { status: ShiftScheduleStatus; assignments: ShiftAssignment[] } | null;
        };

        if (!active) {
          return;
        }

        if (body.data) {
          setAssignments(applyClosedDayOff(normalizeAssignments(body.data.assignments)));
          setScheduleStatus(body.data.status);
          setIsSavedSchedule(true);
          setHasDraftEdits(false);
        } else {
          setAssignments(applyClosedDayOff([]));
          setScheduleStatus(null);
          setIsSavedSchedule(false);
          setHasDraftEdits(false);
        }
        loadedMonthRef.current = targetMonth;
      } catch {
        if (!active) {
          return;
        }
        setAssignments(applyClosedDayOff([]));
        setScheduleStatus(null);
        setIsSavedSchedule(false);
        setHasDraftEdits(false);
        loadedMonthRef.current = targetMonth;
        setSaveMessage("読込に失敗しました");
      } finally {
        if (active) {
          setIsLoadingSchedule(false);
        }
      }
    };

    void loadSchedule();
    return () => {
      active = false;
    };
  }, [
    targetMonth,
    year,
    month,
    shiftTypes,
    staffIds,
    normalizeAssignments,
    applyClosedDayOff,
    readOnly,
  ]);

  useEffect(() => {
    if (!loadedMonthRef.current || loadedMonthRef.current !== targetMonth) {
      return;
    }

    setAssignments((current) => applyClosedDayOff(current));
  }, [applyClosedDayOff, targetMonth]);

  const changeMonth = (delta: number) => {
    requestsAppliedRef.current = null;
    setTargetMonth(shiftTargetMonth(targetMonth, delta));
  };

  useEffect(() => {
    if (readOnly || isLoadingSchedule || isStaffRequestsLoading) {
      return;
    }
    if (loadedMonthRef.current !== targetMonth) {
      return;
    }
    if (staffRequestGroups.length === 0) {
      return;
    }
    if (isSavedSchedule || requestsAppliedRef.current === targetMonth) {
      return;
    }

    requestsAppliedRef.current = targetMonth;
    setAssignments((current) => applyClosedDayOff(applyRequestsToAssignments(current)));
    setHasDraftEdits(true);
  }, [
    applyClosedDayOff,
    applyRequestsToAssignments,
    isLoadingSchedule,
    isSavedSchedule,
    isStaffRequestsLoading,
    readOnly,
    staffRequestGroups,
    targetMonth,
  ]);

  const handleApplyRequests = () => {
    if (staffRequestGroups.length === 0) {
      setSaveMessage("この月の出勤希望はありません。");
      return;
    }

    setAssignments((current) => applyClosedDayOff(applyRequestsToAssignments(current)));
    setScheduleStatus("draft");
    setIsSavedSchedule(false);
    setHasDraftEdits(true);
    setSaveMessage("出勤希望を勤務表に反映しました。");
  };

  const runAiGeneration = async () => {
    setSaveMessage("");
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/shift-schedules/generate?month=${targetMonth}`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        data?: {
          assignments: ShiftAssignment[];
          source: "gemini" | "fallback";
          warnings?: string[];
        };
        error?: string;
      };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "generate_failed");
      }

      setAssignments(
        applyClosedDayOff(
          applyRequestsToAssignments(normalizeAssignments(body.data.assignments)),
        ),
      );
      setScheduleStatus("draft");
      setIsSavedSchedule(false);
      setHasDraftEdits(true);

      if (body.data.source === "gemini") {
        setSaveMessage("AIで作成しました");
      } else {
        const warning = body.data.warnings?.[0];
        setSaveMessage(warning ?? "ルールベースで作成しました");
      }
    } catch {
      setSaveMessage("AI作成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const persistSchedule = async (status: ShiftScheduleStatus) => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch(`/api/shift-schedules?month=${targetMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignments,
        }),
      });
      if (!response.ok) {
        throw new Error("save_failed");
      }
      setScheduleStatus(status);
      setSaveMessage(status === "published" ? "公開しました" : "保存しました");
      setIsSavedSchedule(true);
      setHasDraftEdits(false);
    } catch {
      setSaveMessage(status === "published" ? "公開に失敗しました" : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    void persistSchedule("draft");
  };

  const handlePublish = () => {
    void persistSchedule("published");
  };

  const setCellShift = (
    staffId: string,
    workDate: string,
    shiftType: ShiftCellValue | "",
  ) => {
    if (isClosedDate(workDate, holidaySettings)) {
      return;
    }

    setAssignments((current) => {
      if (!shiftType) {
        return current.filter(
          (assignment) =>
            !(assignment.staff_id === staffId && assignment.work_date === workDate),
        );
      }

      const index = current.findIndex(
        (assignment) =>
          assignment.staff_id === staffId && assignment.work_date === workDate,
      );

      let next: ShiftAssignment[];
      if (index < 0) {
        next = [
          ...current,
          { staff_id: staffId, work_date: workDate, shift_type: shiftType },
        ];
      } else {
        next = current.map((assignment) => {
          if (assignment.staff_id !== staffId || assignment.work_date !== workDate) {
            return assignment;
          }

          return { ...assignment, shift_type: shiftType };
        });
      }

      return next;
    });
    setScheduleStatus("draft");
    setIsSavedSchedule(false);
    setHasDraftEdits(true);
  };

  const printedAtLabel = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isLoading =
    isStaffLoading || isClassroomsLoading || isShiftTypesLoading || isLoadingSchedule || isGenerating;
  const loadError = staffError ?? classroomsError ?? shiftTypesError;

  if (isLoading) {
    return <p className="classes-panel__count">読み込み中…</p>;
  }

  if (loadError) {
    return <p style={{ color: "var(--danger)" }}>{loadError}</p>;
  }

  if (shiftTypes.filter((shift) => shift.is_active).length === 0) {
    return (
      <p style={{ color: "var(--muted)" }}>
        勤務区分が登録されていません。園管理の「勤務区分マスタ」で区分を追加してください。
      </p>
    );
  }

  if (readOnly && scheduleStatus !== "published") {
    return (
      <section
        className="classes-panel shift-schedule-panel shift-schedule-panel--readonly"
        aria-label="月間勤務表"
      >
        <div className="classes-panel__fixed">
          <p className="classes-panel__count">
            {formatTargetMonthLabel(targetMonth)} · 準備中
          </p>
          <p style={{ margin: 0, color: "var(--muted)", fontWeight: 700, fontSize: "0.92rem" }}>
            この月の勤務表はまだ公開されていません。管理者が公開すると、ここに勤務表が表示されます。
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => changeMonth(-1)}
            >
              前月
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => changeMonth(1)}
            >
              翌月
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "classes-panel classes-panel--scroll-body shift-schedule-panel",
        readOnly ? "shift-schedule-panel--readonly" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="月間勤務表"
    >
      <div className="shift-schedule-print-header shift-schedule-print-only">
        <p className="shift-schedule-print-header__nursery">{nurseryName}</p>
        <h2 className="shift-schedule-print-header__title">
          {formatTargetMonthLabel(targetMonth)} 勤務表
        </h2>
        <p className="shift-schedule-print-header__meta">
          職員 {staffRows.length}名 · 印刷日 {printedAtLabel}
        </p>
      </div>

      <div className="classes-panel__fixed no-print">
        <div className="classes-panel__toolbar">
          <p className="classes-panel__count">
            {formatTargetMonthLabel(targetMonth)} · 職員 {staffRows.length}名 ·{" "}
            {readOnly
              ? scheduleStatus === "published"
                ? "公開済み"
                : "未作成"
              : scheduleStatus === "published"
                ? "公開済み"
              : isSavedSchedule
                ? "保存済み"
                : hasDraftEdits
                  ? "編集中（未保存）"
                  : "未作成"}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!readOnly ? (
              <>
            <button
              className="primary-button"
              type="button"
              disabled={isGenerating || isLoading}
              onClick={() => void runAiGeneration()}
              style={{ padding: "8px 14px" }}
            >
              {isGenerating ? "AI作成中..." : "AIで作成"}
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              disabled={isSaving || isLoading || isStaffRequestsLoading}
              onClick={handleApplyRequests}
            >
              希望を反映
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              disabled={isSaving || isLoading}
              onClick={handleSave}
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              disabled={isSaving || isLoading || assignments.length === 0}
              onClick={handlePublish}
            >
              公開
            </button>
              </>
            ) : null}
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => changeMonth(-1)}
            >
              前月
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => changeMonth(1)}
            >
              翌月
            </button>
            {!readOnly ? (
              <button
                className="secondary-button secondary-button--compact"
                type="button"
                onClick={() => window.print()}
              >
                印刷
              </button>
            ) : null}
          </div>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontWeight: 600, fontSize: "0.92rem" }}>
          {readOnly
            ? "この画面では勤務表を確認できます。編集は管理者の「勤務表作成」から行います。"
            : scheduleStatus === "published"
              ? "公開済みの勤務表です。編集すると未保存の変更として扱われます。"
            : isSavedSchedule
              ? "保存済みの勤務表です。「保存」で上書き保存できます。"
              : hasDraftEdits
                ? "編集中の内容はまだ保存されていません。「保存」を押してください。"
                : "この月の勤務表はまだありません。「AIで作成」または各セルから入力してください。"}
          {" "}
          休日設定の定休・休園日は日付ヘッダーに「休園」として表示され、休園日のセルは自動で「休」になります。
        </p>
        {isLoadingSchedule ? (
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontWeight: 700, fontSize: "0.82rem" }}>
            保存データを読込中です...
          </p>
        ) : null}
        {!isLoadingSchedule && saveMessage ? (
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontWeight: 700, fontSize: "0.82rem" }}>
            {saveMessage}
          </p>
        ) : null}
        {!readOnly && staffRequestsError ? (
          <p style={{ margin: "8px 0 0", color: "var(--error)", fontWeight: 700, fontSize: "0.82rem" }}>
            出勤希望の読み込みに失敗しました。反映できない場合があります。
          </p>
        ) : null}
      </div>

      <div className="classes-panel__scroll-region shift-schedule-panel__grid-region">
        <div className="shift-schedule-grid-wrap">
          <table className="shift-schedule-grid">
            <colgroup>
              <col className="shift-schedule-grid__col-class" />
              <col className="shift-schedule-grid__col-staff" />
              {dateKeys.map((dateKey) => (
                <col className="shift-schedule-grid__col-date" key={dateKey} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  className="shift-schedule-grid__corner shift-schedule-grid__corner--class"
                  scope="col"
                >
                  クラス
                </th>
                <th
                  className="shift-schedule-grid__corner shift-schedule-grid__corner--staff"
                  scope="col"
                >
                  職員
                </th>
                {dateKeys.map((dateKey) => {
                  const header = formatDateHeader(dateKey);
                  const closedBySettings = isClosedDate(dateKey, holidaySettings);
                  const closedDay = getClosedDayForDate(dateKey, holidaySettings);
                  const publicHoliday = getPublicHolidayForDate(dateKey, holidaySettings);
                  return (
                    <th
                      key={dateKey}
                      className={
                        header.isSunday
                          ? "shift-schedule-grid__date is-sunday"
                          : header.isSaturday
                            ? "shift-schedule-grid__date is-saturday"
                            : "shift-schedule-grid__date"
                      }
                      scope="col"
                      title={
                        closedBySettings
                          ? closedDay?.title
                            ? `休園: ${closedDay.title}`
                            : publicHoliday?.title
                              ? `休園: ${publicHoliday.title}`
                            : "休園日"
                          : undefined
                      }
                      style={
                        closedBySettings
                          ? {
                              background: "rgba(239, 68, 68, 0.12)",
                              borderBottomColor: "rgba(239, 68, 68, 0.45)",
                            }
                          : undefined
                      }
                    >
                      <span className="shift-schedule-grid__weekday">{header.weekday}</span>
                      <span className="shift-schedule-grid__day">{header.day}</span>
                      {closedBySettings ? (
                        <span className="shift-schedule-grid__closed-label no-print">
                          休園
                        </span>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {classSections
                .filter((section) => section.staffRows.length > 0)
                .flatMap((section) =>
                  section.staffRows.map((row, rowIndex) => {
                    const staffMember = staffById.get(row.staffId);
                    if (!staffMember) {
                      return null;
                    }

                    const surname = getStaffSurname(staffMember.name);
                    const sectionKey = section.classroomId ?? "unassigned";

                    return (
                      <tr key={`${sectionKey}-${staffMember.id}`}>
                        {rowIndex === 0 ? (
                          <th
                            className="shift-schedule-grid__class"
                            rowSpan={section.staffRows.length}
                            scope="rowgroup"
                          >
                            {section.className}
                          </th>
                        ) : null}
                        <th className="shift-schedule-grid__staff" scope="row">
                          {surname}
                        </th>
                        {dateKeys.map((dateKey) => {
                          const closedBySettings = isClosedDate(dateKey, holidaySettings);
                          const shiftType = getAssignmentForCell(
                            assignmentMap,
                            staffMember.id,
                            dateKey,
                          );

                          return (
                            <td
                              key={`${staffMember.id}-${dateKey}`}
                              className={getShiftCellClassName(shiftType, shiftTypeById)}
                              style={{
                                ...getShiftCellInlineStyle(shiftType, shiftTypeById),
                                ...(closedBySettings
                                  ? { boxShadow: "inset 0 0 0 9999px rgba(239, 68, 68, 0.06)" }
                                  : {}),
                              }}
                            >
                              <span
                                className={
                                  readOnly
                                    ? "shift-schedule-grid__readonly-value"
                                    : "shift-schedule-grid__print-value"
                                }
                                aria-hidden={!readOnly}
                              >
                                {getShiftCellDisplayLabel(shiftType, shiftTypeById)}
                              </span>
                              {!readOnly ? (
                                <select
                                  className="shift-schedule-grid__select no-print"
                                  value={shiftType ?? ""}
                                  aria-label={`${surname} ${dateKey} の勤務区分`}
                                  disabled={closedBySettings}
                                  onChange={(event) =>
                                    setCellShift(
                                      staffMember.id,
                                      dateKey,
                                      event.target.value as ShiftCellValue | "",
                                    )
                                  }
                                >
                                  <option value="">—</option>
                                  {cellOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }),
                )}
            </tbody>
          </table>
        </div>

        <ShiftScheduleLegend
          items={legendItems}
          className="shift-schedule-legend no-print"
        />
        <ShiftScheduleLegend
          items={legendItems}
          className="shift-schedule-legend shift-schedule-print-only"
        />
      </div>
    </section>
  );
}
