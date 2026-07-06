"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useClassroomsList } from "@/hooks/use-classrooms-list";
import { useStaffList } from "@/hooks/use-staff-list";
import { sortClassrooms } from "@/lib/classroom-helpers";
import {
  formatCalendarEntrySummary,
  type NurseryCalendarEntry,
} from "@/lib/nursery-helpers";
import { RosterClassColumnHeader } from "@/components/roster/roster-class-column-header";
import { RosterStaffSelect } from "@/components/roster/roster-staff-select";
import { apiFetch } from "@/lib/api-fetch";
import {
  addDaysToDateKey,
  buildMockRosterAssignments,
  buildRosterAssignmentMap,
  buildRosterTimeSlots,
  dailyChildCountKey,
  formatRosterStaffLabels,
  formatRosterDateHeading,
  getRosterCellStaffIds,
  migrateRosterAssignments,
  setRosterCellStaffIds,
  toDateKey,
  type RosterCellAssignment,
  type RosterTimeSlot,
} from "@/lib/roster-helpers";
import { buildAssignmentsFromPresences, type StaffPresence } from "@/lib/roster-draft";

type DailyRosterGridProps = {
  nurseryName?: string;
  readOnly?: boolean;
  showEvents?: boolean;
  className?: string;
};

type RosterRow =
  | { id: string; kind: "schedule"; timeSlot: RosterTimeSlot }
  | { id: string; kind: "note"; label: string; notesByClassroom: Record<string, string> };

const createRowId = () =>
  `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const HEADER_ADD_MENU_ID = "__header_add_menu__";
const DEFAULT_START_TIME = "07:00";
const DEFAULT_END_TIME = "19:00";
const DEFAULT_STEP_MINUTES = 60;

type RosterPersistencePayload = {
  rows: RosterRow[];
  assignments: RosterCellAssignment[];
  todayChildCounts: Record<string, number>;
  slotCountsByRowAndClass: Record<string, number>;
};

const LS_KEY_COLUMN_WIDTHS = "roster:layout:columnWidths";
const LS_KEY_ROW_HEIGHTS_PREFIX = "roster:layout:rowHeights:";

function loadColumnWidthsFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_KEY_COLUMN_WIDTHS);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function loadRowHeightsFromStorage(dateKey: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${LS_KEY_ROW_HEIGHTS_PREFIX}${dateKey}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveColumnWidthsToStorage(widths: Record<string, number>) {
  try {
    localStorage.setItem(LS_KEY_COLUMN_WIDTHS, JSON.stringify(widths));
  } catch {
    // localStorage unavailable (SSR or private browsing) — silently ignore
  }
}

function saveRowHeightsToStorage(dateKey: string, heights: Record<string, number>) {
  try {
    localStorage.setItem(`${LS_KEY_ROW_HEIGHTS_PREFIX}${dateKey}`, JSON.stringify(heights));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function createDefaultRows() {
  return buildRosterTimeSlots(DEFAULT_START_TIME, DEFAULT_END_TIME, DEFAULT_STEP_MINUTES).map(
    (timeSlot) => ({
      id: createRowId(),
      kind: "schedule" as const,
      timeSlot,
    }),
  );
}

export function DailyRosterGrid({
  nurseryName = "保育園",
  readOnly = false,
  showEvents = true,
  className,
}: DailyRosterGridProps) {
  const {
    classrooms: loadedClassrooms,
    isLoading: isClassroomsLoading,
    error: classroomsError,
  } = useClassroomsList();
  const { staff, isLoading: isStaffLoading, error: staffError, getStaffName } = useStaffList();

  const classrooms = useMemo(() => sortClassrooms(loadedClassrooms), [loadedClassrooms]);

  const [focusDate, setFocusDate] = useState(() => toDateKey(new Date()));
  const [rows, setRows] = useState<RosterRow[]>(() => createDefaultRows());
  const scheduleTimeSlots = useMemo(
    () => rows.filter((row): row is Extract<RosterRow, { kind: "schedule" }> => row.kind === "schedule").map((row) => row.timeSlot),
    [rows],
  );

  const [assignments, setAssignments] = useState<RosterCellAssignment[]>([]);

  /** 日付×クラスごとの「今日の園児数」 */
  const [dailyChildCounts, setDailyChildCounts] = useState<Record<string, number>>({});
  /** 日付×クラス×時間ごとの表示プルダウン数 */
  const [cellSlotCounts, setCellSlotCounts] = useState<Record<string, number>>({});
  const [addMenuRowId, setAddMenuRowId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [hasPublishedSchedule, setHasPublishedSchedule] = useState<boolean | null>(null);
  const [draftPayload, setDraftPayload] = useState<RosterPersistencePayload | null>(null);
  const [staffPresences, setStaffPresences] = useState<StaffPresence[]>([]);
  const [hasExistingRoster, setHasExistingRoster] = useState(false);
  const [todayEvents, setTodayEvents] = useState<NurseryCalendarEntry[]>([]);
  const columnResizeState = useRef<{ classroomId: string; startX: number; startWidth: number } | null>(null);
  const rowResizeState = useRef<{ rowId: string; startY: number; startHeight: number } | null>(null);
  const focusDateRef = useRef(focusDate);

  const assignmentMap = useMemo(
    () => buildRosterAssignmentMap(assignments),
    [assignments],
  );

  const dateHeading = formatRosterDateHeading(focusDate);
  const bodyRowCount = Math.max(rows.length, 1);
  const rosterPrintStyle = {
    "--roster-body-rows": bodyRowCount,
  } as CSSProperties;

  const resolveStaffName = useMemo(
    () => (staffId: string) => getStaffName(staffId),
    [getStaffName],
  );

  const isMasterLoading = isClassroomsLoading || isStaffLoading;
  const masterLoadError = classroomsError ?? staffError;
  const isLoading = isMasterLoading || isLoadingRoster;

  useEffect(() => {
    let active = true;

    const loadTodayEvents = async () => {
      try {
        const params = new URLSearchParams({
          from: focusDate,
          to: focusDate,
        });
        const response = await apiFetch(`/api/calendar-entries?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as { data?: NurseryCalendarEntry[] };
        if (!active) {
          return;
        }
        if (!response.ok || !body.data) {
          setTodayEvents([]);
          return;
        }
        setTodayEvents(body.data);
      } catch {
        if (active) {
          setTodayEvents([]);
        }
      }
    };

    void loadTodayEvents();
    return () => {
      active = false;
    };
  }, [focusDate]);

  const updateTodayChildCount = (classroomId: string, count: number) => {
    const key = dailyChildCountKey(focusDate, classroomId);
    setDailyChildCounts((current) => ({ ...current, [key]: count }));
  };

  const resetTodayChildCount = (classroomId: string) => {
    const key = dailyChildCountKey(focusDate, classroomId);
    setDailyChildCounts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const updateCellStaffAtIndex = (
    rowId: string,
    classroomId: string,
    slotIndex: number,
    staffId: string,
  ) => {
    setAssignments((current) => {
      const map = buildRosterAssignmentMap(current);
      const currentIds = getRosterCellStaffIds(map, classroomId, rowId);
      const slots = [...currentIds];

      while (slots.length <= slotIndex) {
        slots.push("");
      }

      slots[slotIndex] = staffId;

      const nextIds = slots.filter(Boolean);
      return setRosterCellStaffIds(current, rowId, classroomId, nextIds);
    });
    setCellSlotCounts((current) => ({
      ...current,
      [`${focusDate}:${rowId}:${classroomId}`]: Math.max(slotIndex + 1, current[`${focusDate}:${rowId}:${classroomId}`] ?? 0),
    }));
  };

  const getCellSlotCount = (
    classroomId: string,
    rowId: string,
    assignedStaffCount: number,
  ) => {
    const key = `${focusDate}:${rowId}:${classroomId}`;
    return Math.max(0, cellSlotCounts[key] ?? assignedStaffCount);
  };

  const changeCellSlotCount = (
    rowId: string,
    classroomId: string,
    delta: number,
    assignedStaffIds: string[],
  ) => {
    const key = `${focusDate}:${rowId}:${classroomId}`;
    setCellSlotCounts((current) => {
      const base = Math.max(0, current[key] ?? assignedStaffIds.length);
      const nextValue = Math.max(0, base + delta);
      const clippedValue = Math.max(0, nextValue);
      if (clippedValue < assignedStaffIds.length) {
        setAssignments((prev) =>
          setRosterCellStaffIds(
            prev,
            rowId,
            classroomId,
            assignedStaffIds.slice(0, clippedValue),
          ),
        );
      }
      return {
        ...current,
        [key]: clippedValue,
      };
    });
  };

  const runAiGeneration = () => {
    const scheduleRows = rows
      .filter((row): row is Extract<RosterRow, { kind: "schedule" }> => row.kind === "schedule")
      .map((row) => ({ id: row.id, timeSlot: row.timeSlot }));
    setAssignments(buildMockRosterAssignments(focusDate, scheduleRows, classrooms));
  };

  const applyDraftPayload = (payload: RosterPersistencePayload) => {
    setRows(payload.rows);
    setAssignments(migrateRosterAssignments(payload.rows, payload.assignments, classrooms));
    setHasExistingRoster(false);
    setCellSlotCounts((current) => {
      const next = { ...current };
      const prefix = `${focusDate}:`;
      for (const key of Object.keys(next)) {
        if (key.startsWith(prefix)) {
          delete next[key];
        }
      }
      return next;
    });
    setSaveMessage("シフト表からたたき台を生成しました。内容を確認して「保存」してください。");
  };

  const handleGenerateFromShift = () => {
    if (hasPublishedSchedule !== true) return;

    if (hasExistingRoster) {
      // 保存済み行・枠を保持してスタッフだけ充填
      if (!window.confirm("現在の配置をシフト表のスタッフで上書きします。行・枠の構造は保持されます。\n\n「保存」ボタンを押すまで DB には反映されません。")) {
        return;
      }
      const newAssignments = buildAssignmentsFromPresences(rows, staffPresences);
      setAssignments(newAssignments);
      setSaveMessage("シフト表からスタッフを配置しました。内容を確認して「保存」してください。");
    } else {
      // 保存データなし → デフォルト行で新規作成
      if (!draftPayload) return;
      applyDraftPayload(draftPayload);
    }
  };

  const buildPersistencePayload = (): RosterPersistencePayload => {
    const todayChildCounts = classrooms.reduce<Record<string, number>>((acc, classroom) => {
      const key = dailyChildCountKey(focusDate, classroom.id);
      if (key in dailyChildCounts) {
        acc[classroom.id] = dailyChildCounts[key]!;
      }
      return acc;
    }, {});

    const prefix = `${focusDate}:`;
    const slotCountsByRowAndClass = Object.entries(cellSlotCounts).reduce<Record<string, number>>(
      (acc, [key, value]) => {
        if (!key.startsWith(prefix)) {
          return acc;
        }
        acc[key.slice(prefix.length)] = value;
        return acc;
      },
      {},
    );

    return {
      rows,
      assignments,
      todayChildCounts,
      slotCountsByRowAndClass,
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const response = await apiFetch(`/api/roster?date=${focusDate}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPersistencePayload()),
      });
      if (!response.ok) {
        throw new Error("save_failed");
      }
      setSaveMessage("保存しました");
    } catch {
      setSaveMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTimeSlotAt = (rowId: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId && row.kind === "schedule" ? { ...row, timeSlot: value } : row,
      ),
    );
  };

  const insertRowAfter = (targetRowId: string, nextRow: RosterRow) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.id === targetRowId);
      if (index < 0) {
        return [...current, nextRow];
      }
      return [...current.slice(0, index + 1), nextRow, ...current.slice(index + 1)];
    });
  };

  const addScheduleRowAfter = (targetRowId: string) => {
    insertRowAfter(targetRowId, { id: createRowId(), kind: "schedule", timeSlot: "" });
    setAddMenuRowId(null);
  };

  const addNoteRowAfter = (targetRowId: string) => {
    const notesByClassroom = classrooms.reduce<Record<string, string>>((acc, classroom) => {
      acc[classroom.id] = "";
      return acc;
    }, {});
    insertRowAfter(targetRowId, { id: createRowId(), kind: "note", label: "", notesByClassroom });
    setAddMenuRowId(null);
  };

  const addScheduleRowFromHeader = () => {
    setRows((current) => [{ id: createRowId(), kind: "schedule", timeSlot: "" }, ...current]);
    setAddMenuRowId(null);
  };

  const addNoteRowFromHeader = () => {
    const notesByClassroom = classrooms.reduce<Record<string, string>>((acc, classroom) => {
      acc[classroom.id] = "";
      return acc;
    }, {});
    setRows((current) => [{ id: createRowId(), kind: "note", label: "", notesByClassroom }, ...current]);
    setAddMenuRowId(null);
  };

  const updateNoteRow = (rowId: string, classroomId: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId && row.kind === "note"
          ? {
              ...row,
              notesByClassroom: {
                ...row.notesByClassroom,
                [classroomId]: value,
              },
            }
          : row,
      ),
    );
  };

  const updateNoteRowLabel = (rowId: string, label: string) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId && row.kind === "note" ? { ...row, label } : row)),
    );
  };

  const removeRow = (rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
    setAssignments((current) => current.filter((assignment) => assignment.row_id !== rowId));
    setCellSlotCounts((current) => {
      const next = { ...current };
      const prefix = `${focusDate}:${rowId}:`;
      for (const key of Object.keys(next)) {
        if (key.startsWith(prefix)) {
          delete next[key];
        }
      }
      return next;
    });
    setRowHeights((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
    if (addMenuRowId === rowId) {
      setAddMenuRowId(null);
    }
  };

  const startColumnResize = (
    classroomId: string,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    const currentWidth = columnWidths[classroomId] ?? 120;
    columnResizeState.current = {
      classroomId,
      startX: event.clientX,
      startWidth: currentWidth,
    };
  };

  const startRowResize = (rowId: string, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const currentHeight = rowHeights[rowId] ?? 56;
    rowResizeState.current = {
      rowId,
      startY: event.clientY,
      startHeight: currentHeight,
    };
  };

  useEffect(() => {
    focusDateRef.current = focusDate;
  }, [focusDate]);

  useEffect(() => {
    setColumnWidths(loadColumnWidthsFromStorage());
  }, []);

  useEffect(() => {
    saveColumnWidthsToStorage(columnWidths);
  }, [columnWidths]);

  useEffect(() => {
    saveRowHeightsToStorage(focusDateRef.current, rowHeights);
  }, [rowHeights]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (columnResizeState.current) {
        const { classroomId, startX, startWidth } = columnResizeState.current;
        const nextWidth = Math.max(76, startWidth + (event.clientX - startX));
        setColumnWidths((current) => ({ ...current, [classroomId]: nextWidth }));
      }

      if (rowResizeState.current) {
        const { rowId, startY, startHeight } = rowResizeState.current;
        const nextHeight = Math.max(44, startHeight + (event.clientY - startY));
        setRowHeights((current) => ({ ...current, [rowId]: nextHeight }));
      }
    };

    const onMouseUp = () => {
      columnResizeState.current = null;
      rowResizeState.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadRoster = async () => {
      setIsLoadingRoster(true);
      setSaveMessage("");
      setHasPublishedSchedule(null);
      setDraftPayload(null);
      setStaffPresences([]);
      try {
        const [rosterResponse, draftResponse] = await Promise.all([
          apiFetch(`/api/roster?date=${focusDate}`, { method: "GET", cache: "no-store" }),
          apiFetch(`/api/roster/draft?date=${focusDate}`, { method: "GET", cache: "no-store" }),
        ]);

        if (!rosterResponse.ok) {
          throw new Error("load_failed");
        }
        const data = (await rosterResponse.json()) as { data: RosterPersistencePayload | null };

        if (draftResponse.ok) {
          const draftData = (await draftResponse.json()) as {
            hasPublishedSchedule: boolean;
            draft: RosterPersistencePayload | null;
            staffPresences: StaffPresence[];
          };
          if (active) {
            setHasPublishedSchedule(draftData.hasPublishedSchedule);
            setDraftPayload(draftData.draft);
            setStaffPresences(draftData.staffPresences ?? []);
          }
        }

        if (!active) {
          return;
        }

        if (!data.data) {
          setHasExistingRoster(false);
          setRows(createDefaultRows());
          setAssignments([]);
          setRowHeights(loadRowHeightsFromStorage(focusDate));
          setDailyChildCounts((current) => {
            const next = { ...current };
            for (const classroom of classrooms) {
              delete next[dailyChildCountKey(focusDate, classroom.id)];
            }
            return next;
          });
          setCellSlotCounts((current) => {
            const next = { ...current };
            const prefix = `${focusDate}:`;
            for (const key of Object.keys(next)) {
              if (key.startsWith(prefix)) {
                delete next[key];
              }
            }
            return next;
          });
          return;
        }

        setHasExistingRoster(true);
        setRows(data.data.rows);
        setAssignments(migrateRosterAssignments(data.data.rows, data.data.assignments, classrooms));
        setRowHeights(loadRowHeightsFromStorage(focusDate));
        setDailyChildCounts((current) => {
          const next = { ...current };
          for (const classroom of classrooms) {
            const key = dailyChildCountKey(focusDate, classroom.id);
            if (classroom.id in data.data!.todayChildCounts) {
              next[key] = data.data!.todayChildCounts[classroom.id]!;
            } else {
              delete next[key];
            }
          }
          return next;
        });
        setCellSlotCounts((current) => {
          const next = { ...current };
          const prefix = `${focusDate}:`;
          for (const key of Object.keys(next)) {
            if (key.startsWith(prefix)) {
              delete next[key];
            }
          }
          for (const [key, value] of Object.entries(data.data!.slotCountsByRowAndClass ?? {})) {
            next[`${prefix}${key}`] = value;
          }
          return next;
        });
      } catch {
        if (!active) {
          return;
        }
        setSaveMessage("読込に失敗しました");
      } finally {
        if (active) {
          setIsLoadingRoster(false);
        }
      }
    };

    void loadRoster();
    return () => {
      active = false;
    };
  }, [focusDate, classrooms]);

  if (isMasterLoading) {
    return <p className="classes-panel__count">読み込み中…</p>;
  }

  if (masterLoadError) {
    return <p style={{ color: "var(--danger)" }}>{masterLoadError}</p>;
  }

  if (classrooms.length === 0) {
    return (
      <p style={{ color: "var(--muted)" }}>
        クラスが登録されていません。園管理の「クラス管理」でクラスを追加してください。
      </p>
    );
  }

  return (
    <section
      className={[
        "classes-panel classes-panel--scroll-body roster-panel roster-print-layout",
        readOnly ? "roster-panel--readonly" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="体制表"
      style={rosterPrintStyle}
    >
      <div className="roster-print-header roster-print-only">
        <h2 className="roster-print-header__title">体制表</h2>
        <p className="roster-print-header__date">{dateHeading}</p>
        <div className="roster-print-header__events">
          <p className="roster-print-header__events-title">本日の行事</p>
          {todayEvents.length === 0 ? (
            <p className="roster-print-header__events-empty">本日の登録行事はありません。</p>
          ) : (
            <ul className="roster-print-header__event-list">
              {todayEvents.map((entry) => (
                <li key={entry.id}>{formatCalendarEntrySummary(entry)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="classes-panel__fixed no-print">
        <div className="classes-panel__toolbar">
          <p className="classes-panel__count">{dateHeading}</p>
          {!readOnly ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="primary-button"
                type="button"
                onClick={runAiGeneration}
                style={{ padding: "8px 14px" }}
              >
                AIで作成
              </button>
              <button
                className="secondary-button secondary-button--compact"
                type="button"
                disabled={hasPublishedSchedule !== true}
                title={
                  hasPublishedSchedule === false
                    ? "この日の公開済みシフト表がありません"
                    : hasPublishedSchedule === null
                      ? "確認中..."
                      : "公開済みシフト表からたたき台を生成します"
                }
                onClick={handleGenerateFromShift}
              >
                シフト表から生成
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
                onClick={() => window.print()}
              >
                印刷
              </button>
              <button
                className="secondary-button secondary-button--compact"
                type="button"
                onClick={() => setFocusDate((current) => addDaysToDateKey(current, -1))}
              >
                前日
              </button>
              <button
                className="secondary-button secondary-button--compact"
                type="button"
                onClick={() => setFocusDate(toDateKey(new Date()))}
              >
                今日
              </button>
              <button
                className="secondary-button secondary-button--compact"
                type="button"
                onClick={() => setFocusDate((current) => addDaysToDateKey(current, 1))}
              >
                翌日
              </button>
            </div>
          ) : null}
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontWeight: 600, fontSize: "0.92rem" }}>
          {nurseryName} · 縦軸は
          {scheduleTimeSlots.length > 0
            ? ` ${scheduleTimeSlots[0]}〜${scheduleTimeSlots[scheduleTimeSlots.length - 1]}`
            : " 未設定"}
          、横軸はクラスごとの配置です。
          {readOnly ? "本日の配置を確認できます。" : "各列の「今日」で園児数、各セルで職員を編集できます。"}
        </p>
        {isLoading ? (
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 700, fontSize: "0.82rem" }}>
            保存データを読込中です...
          </p>
        ) : null}
        {!isLoading && saveMessage ? (
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 700, fontSize: "0.82rem" }}>
            {saveMessage}
          </p>
        ) : null}
        {showEvents ? (
          <section className="roster-sheet-head">
            <div className="roster-sheet-head__events">
              <p className="roster-sheet-head__title">本日の行事</p>
              {todayEvents.length === 0 ? (
                <p className="roster-sheet-head__empty">本日の登録行事はありません。</p>
              ) : (
                <ul className="roster-sheet-head__event-list">
                  {todayEvents.map((entry) => (
                    <li key={entry.id}>{formatCalendarEntrySummary(entry)}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div className="classes-panel__scroll-region roster-grid-wrap roster-print-table-wrap">
        <table className="roster-grid roster-print-table">
            <thead>
              <tr>
                <th className="roster-grid__corner" scope="col">
                  <div className="roster-grid__time-header">
                    <span>時間</span>
                  </div>
                  <div className="roster-grid__time-cell-tools no-print">
                    <button
                      type="button"
                      className="roster-grid__required-btn"
                      aria-label="末尾に行を追加"
                      onClick={() =>
                        setAddMenuRowId((current) =>
                          current === HEADER_ADD_MENU_ID ? null : HEADER_ADD_MENU_ID,
                        )
                      }
                    >
                      ＋
                    </button>
                    {addMenuRowId === HEADER_ADD_MENU_ID ? (
                      <div className="roster-grid__add-row-menu roster-grid__add-row-menu--down">
                        <button type="button" onClick={addScheduleRowFromHeader}>
                          スケジュール行
                        </button>
                        <button type="button" onClick={addNoteRowFromHeader}>
                          備考行
                        </button>
                      </div>
                    ) : null}
                  </div>
                </th>
                {classrooms.map((classroom) => (
                  <th
                    key={classroom.id}
                    className="roster-grid__class"
                    scope="col"
                    style={{
                      width: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined,
                      minWidth: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined,
                    }}
                  >
                    <RosterClassColumnHeader
                      classroom={classroom}
                      focusDate={focusDate}
                      dailyChildCounts={dailyChildCounts}
                      onTodayCountChange={updateTodayChildCount}
                      onTodayCountReset={resetTodayChildCount}
                    />
                    <div
                      className="roster-grid__col-resizer no-print"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`${classroom.name} 列幅を調整`}
                      onMouseDown={(event) => startColumnResize(classroom.id, event)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isTopBodyRow = rows[0]?.id === row.id;
                if (row.kind === "note") {
                  return (
                    <tr
                      key={row.id}
                      className="roster-grid__note-row roster-grid__body-row"
                      style={{
                        height: rowHeights[row.id] ? `${rowHeights[row.id]}px` : undefined,
                      }}
                    >
                      <th
                        className={
                          addMenuRowId === row.id
                            ? "roster-grid__time roster-grid__time--menu-open"
                            : "roster-grid__time"
                        }
                        scope="row"
                      >
                        <textarea
                          className="roster-grid__note-time-input no-print"
                          value={row.label}
                          placeholder="記入"
                          aria-label="備考行の時間列メモ"
                          onChange={(event) => updateNoteRowLabel(row.id, event.target.value)}
                        />
                        <span className="roster-grid__print-value roster-print-only">
                          {row.label ? row.label : "—"}
                        </span>
                        <div className="roster-grid__time-cell-tools no-print">
                          <button
                            type="button"
                            className="roster-grid__required-btn"
                            aria-label="この行を削除"
                            onClick={() => removeRow(row.id)}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className="roster-grid__required-btn"
                            aria-label="この行の下に行を追加"
                            onClick={() =>
                              setAddMenuRowId((current) => (current === row.id ? null : row.id))
                            }
                          >
                            ＋
                          </button>
                          {addMenuRowId === row.id ? (
                            <div
                              className={
                                isTopBodyRow
                                  ? "roster-grid__add-row-menu roster-grid__add-row-menu--down"
                                  : "roster-grid__add-row-menu"
                              }
                            >
                              <button type="button" onClick={() => addScheduleRowAfter(row.id)}>
                                スケジュール行
                              </button>
                              <button type="button" onClick={() => addNoteRowAfter(row.id)}>
                                備考行
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="roster-grid__row-resizer no-print"
                          role="separator"
                          aria-orientation="horizontal"
                          aria-label="行の高さを調整"
                          onMouseDown={(event) => startRowResize(row.id, event)}
                        />
                      </th>
                      {classrooms.map((classroom) => {
                        const noteValue = row.notesByClassroom[classroom.id] ?? "";
                        return (
                          <td
                            key={`${row.id}-${classroom.id}`}
                            className="roster-grid__note-cell"
                            style={{
                              width: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined,
                              minWidth: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined,
                            }}
                          >
                            <textarea
                              className="roster-grid__note-input no-print"
                              value={noteValue}
                              placeholder="記入"
                              aria-label={`${classroom.name} の備考`}
                              onChange={(event) =>
                                updateNoteRow(row.id, classroom.id, event.target.value)
                              }
                            />
                            <span className="roster-grid__print-value roster-print-only">
                              {noteValue ? noteValue : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                const timeSlot = row.timeSlot;
                return (
                  <tr
                    key={row.id}
                    className="roster-grid__body-row"
                    style={{
                      height: rowHeights[row.id] ? `${rowHeights[row.id]}px` : undefined,
                    }}
                  >
                    <th
                      className={
                        addMenuRowId === row.id
                          ? "roster-grid__time roster-grid__time--menu-open"
                          : "roster-grid__time"
                      }
                      scope="row"
                    >
                      <div className="roster-grid__time-editor">
                        <span className="roster-print-only">{timeSlot}</span>
                        <input
                          type="time"
                          step={1800}
                          className="roster-grid__time-input"
                          value={timeSlot}
                          onChange={(event) => updateTimeSlotAt(row.id, event.target.value)}
                        />
                      </div>
                      <div className="roster-grid__time-cell-tools no-print">
                        <button
                          type="button"
                          className="roster-grid__required-btn"
                          aria-label="この行を削除"
                          onClick={() => removeRow(row.id)}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="roster-grid__required-btn"
                          aria-label="この行の下に行を追加"
                          onClick={() =>
                            setAddMenuRowId((current) => (current === row.id ? null : row.id))
                          }
                        >
                          ＋
                        </button>
                        {addMenuRowId === row.id ? (
                          <div
                            className={
                              isTopBodyRow
                                ? "roster-grid__add-row-menu roster-grid__add-row-menu--down"
                                : "roster-grid__add-row-menu"
                            }
                          >
                            <button type="button" onClick={() => addScheduleRowAfter(row.id)}>
                              スケジュール行
                            </button>
                            <button type="button" onClick={() => addNoteRowAfter(row.id)}>
                              備考行
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div
                        className="roster-grid__row-resizer no-print"
                        role="separator"
                        aria-orientation="horizontal"
                        aria-label="行の高さを調整"
                        onMouseDown={(event) => startRowResize(row.id, event)}
                      />
                    </th>
                    {classrooms.map((classroom) => {
                      const hasTimeValue = Boolean(timeSlot);
                      const staffIds = getRosterCellStaffIds(
                        assignmentMap,
                        classroom.id,
                        row.id,
                      );
                      const slotCount = getCellSlotCount(
                        classroom.id,
                        row.id,
                        staffIds.length,
                      );
                      const slots = Array.from({ length: slotCount }, (_, index) => staffIds[index] ?? "");
                      const printLabels = formatRosterStaffLabels(staffIds, resolveStaffName);
                      const printValue = printLabels.length > 0 ? printLabels.join(" / ") : "—";

                      return (
                        <td
                          key={`${classroom.id}-${row.id}`}
                          className="roster-grid__cell"
                          style={{
                            width: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined,
                            minWidth: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined,
                          }}
                        >
                          <div className="roster-grid__required-controls">
                            <button
                              type="button"
                              className="roster-grid__required-btn"
                              aria-label={`${classroom.name} ${timeSlot} の職員欄を減らす`}
                              disabled={!hasTimeValue}
                              onClick={() =>
                                changeCellSlotCount(row.id, classroom.id, -1, staffIds)
                              }
                            >
                              −
                            </button>
                            <button
                              type="button"
                              className="roster-grid__required-btn"
                              aria-label={`${classroom.name} ${timeSlot} の職員欄を増やす`}
                              disabled={!hasTimeValue}
                              onClick={() =>
                                changeCellSlotCount(row.id, classroom.id, 1, staffIds)
                              }
                            >
                              ＋
                            </button>
                          </div>
                          <span className="roster-grid__print-value roster-print-only">
                            {printValue}
                          </span>
                          <div className="roster-grid__editors">
                            {slots.length === 0 ? (
                              <span className="roster-grid__empty">—</span>
                            ) : (
                              slots.map((staffId, slotIndex) => (
                                <RosterStaffSelect
                                  key={`${classroom.id}-${row.id}-${slotIndex}`}
                                  staff={staff}
                                  value={staffId}
                                  excludedStaffIds={slots.filter((_, index) => index !== slotIndex)}
                                  ariaLabel={`${classroom.name} ${timeSlot} の職員${slotIndex + 1}`}
                                  disabled={!hasTimeValue}
                                  onChange={(nextStaffId) =>
                                    updateCellStaffAtIndex(
                                      row.id,
                                      classroom.id,
                                      slotIndex,
                                      nextStaffId,
                                    )
                                  }
                                />
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>
    </section>
  );
}
