"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useClassroomsList } from "@/hooks/use-classrooms-list";
import { sortClassrooms } from "@/lib/classroom-helpers";
import { apiFetch } from "@/lib/api-fetch";
import {
  buildRosterTimeSlots,
  ROSTER_DEFAULT_START_TIME,
  ROSTER_DEFAULT_END_TIME,
  ROSTER_DEFAULT_STEP_MINUTES,
  type RosterSheetRow,
  type RosterTemplatePayload,
} from "@/lib/roster-helpers";

const createRowId = () =>
  `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const HEADER_ADD_MENU_ID = "__header_add_menu__";

function createDefaultRows(): RosterSheetRow[] {
  return buildRosterTimeSlots(ROSTER_DEFAULT_START_TIME, ROSTER_DEFAULT_END_TIME, ROSTER_DEFAULT_STEP_MINUTES).map(
    (timeSlot) => ({ id: createRowId(), kind: "schedule" as const, timeSlot }),
  );
}

export function RosterTemplateEditor() {
  const { classrooms: loadedClassrooms, isLoading: isClassroomsLoading, error: classroomsError } = useClassroomsList();
  const classrooms = useMemo(() => sortClassrooms(loadedClassrooms), [loadedClassrooms]);

  const [rows, setRows] = useState<RosterSheetRow[]>(createDefaultRows);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [addMenuRowId, setAddMenuRowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const columnResizeState = useRef<{ classroomId: string; startX: number; startWidth: number } | null>(null);

  // テンプレート読み込み
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch("/api/roster/template", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { data: RosterTemplatePayload | null };
        if (body.data) {
          setRows(body.data.rows);
          setSlotCounts(body.data.slotCountsByRowAndClass ?? {});
        }
      } catch {
        // 未保存の場合はデフォルト表示のまま
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const getSlotCount = (rowId: string, classroomId: string) =>
    slotCounts[`${rowId}:${classroomId}`] ?? 0;

  const changeSlotCount = (rowId: string, classroomId: string, delta: number) => {
    const key = `${rowId}:${classroomId}`;
    setSlotCounts((prev) => {
      const current = prev[key] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  };

  const updateTimeSlotAt = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => row.id === rowId && row.kind === "schedule" ? { ...row, timeSlot: value } : row),
    );
  };

  const insertRowAfter = (targetRowId: string, newRow: RosterSheetRow) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === targetRowId);
      if (idx < 0) return [...prev, newRow];
      return [...prev.slice(0, idx + 1), newRow, ...prev.slice(idx + 1)];
    });
  };

  const addScheduleRowAfter = (targetRowId: string) => {
    insertRowAfter(targetRowId, { id: createRowId(), kind: "schedule", timeSlot: "" });
    setAddMenuRowId(null);
  };

  const addNoteRowAfter = (targetRowId: string) => {
    const notesByClassroom = classrooms.reduce<Record<string, string>>((acc, c) => { acc[c.id] = ""; return acc; }, {});
    insertRowAfter(targetRowId, { id: createRowId(), kind: "note", label: "", notesByClassroom });
    setAddMenuRowId(null);
  };

  const addScheduleRowFromHeader = () => {
    setRows((prev) => [{ id: createRowId(), kind: "schedule", timeSlot: "" }, ...prev]);
    setAddMenuRowId(null);
  };

  const addNoteRowFromHeader = () => {
    const notesByClassroom = classrooms.reduce<Record<string, string>>((acc, c) => { acc[c.id] = ""; return acc; }, {});
    setRows((prev) => [{ id: createRowId(), kind: "note", label: "", notesByClassroom }, ...prev]);
    setAddMenuRowId(null);
  };

  const updateNoteRowLabel = (rowId: string, label: string) => {
    setRows((prev) => prev.map((r) => r.id === rowId && r.kind === "note" ? { ...r, label } : r));
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setSlotCounts((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${rowId}:`)) delete next[key];
      }
      return next;
    });
    if (addMenuRowId === rowId) setAddMenuRowId(null);
  };

  const startColumnResize = (classroomId: string, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    columnResizeState.current = { classroomId, startX: event.clientX, startWidth: columnWidths[classroomId] ?? 120 };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!columnResizeState.current) return;
      const { classroomId, startX, startWidth } = columnResizeState.current;
      setColumnWidths((prev) => ({ ...prev, [classroomId]: Math.max(76, startWidth + (e.clientX - startX)) }));
    };
    const onMouseUp = () => { columnResizeState.current = null; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const payload: RosterTemplatePayload = { rows, slotCountsByRowAndClass: slotCounts };
      const res = await apiFetch("/api/roster/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setMessage("テンプレートを保存しました");
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isClassroomsLoading || isLoading) {
    return <p className="classes-panel__count">読み込み中…</p>;
  }

  if (classroomsError) {
    return <p style={{ color: "var(--danger)" }}>{classroomsError}</p>;
  }

  if (classrooms.length === 0) {
    return (
      <p style={{ color: "var(--muted)" }}>
        クラスが登録されていません。園管理の「クラス管理」でクラスを追加してください。
      </p>
    );
  }

  const bodyRowCount = Math.max(rows.length, 1);

  return (
    <section
      className="classes-panel classes-panel--scroll-body roster-panel"
      aria-label="体制表テンプレート編集"
      style={{ "--roster-body-rows": bodyRowCount } as CSSProperties}
    >
      <div className="classes-panel__fixed no-print">
        <div className="classes-panel__toolbar">
          <p className="classes-panel__count">体制表テンプレート</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="primary-button"
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              style={{ padding: "8px 14px" }}
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontWeight: 600, fontSize: "0.92rem" }}>
          縦軸（時間帯）と各セルの枠数を設定してください。スタッフ配置は毎日の体制表で行います。
        </p>
        {message ? (
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 700, fontSize: "0.82rem" }}>
            {message}
          </p>
        ) : null}
      </div>

      <div className="classes-panel__scroll-region roster-grid-wrap">
        <table className="roster-grid">
          <thead>
            <tr>
              <th className="roster-grid__corner" scope="col">
                <div className="roster-grid__time-header"><span>時間</span></div>
                <div className="roster-grid__time-cell-tools">
                  <button
                    type="button"
                    className="roster-grid__required-btn"
                    aria-label="先頭に行を追加"
                    onClick={() => setAddMenuRowId((c) => c === HEADER_ADD_MENU_ID ? null : HEADER_ADD_MENU_ID)}
                  >
                    ＋
                  </button>
                  {addMenuRowId === HEADER_ADD_MENU_ID ? (
                    <div className="roster-grid__add-row-menu roster-grid__add-row-menu--down">
                      <button type="button" onClick={addScheduleRowFromHeader}>スケジュール行</button>
                      <button type="button" onClick={addNoteRowFromHeader}>備考行</button>
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
                  <div style={{ padding: "8px 12px", fontWeight: 700 }}>{classroom.name}</div>
                  <div
                    className="roster-grid__col-resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`${classroom.name} 列幅を調整`}
                    onMouseDown={(e) => startColumnResize(classroom.id, e)}
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
                  <tr key={row.id} className="roster-grid__note-row roster-grid__body-row">
                    <th className={addMenuRowId === row.id ? "roster-grid__time roster-grid__time--menu-open" : "roster-grid__time"} scope="row">
                      <input
                        className="roster-grid__note-time-input"
                        value={row.label}
                        placeholder="備考ラベル"
                        aria-label="備考行ラベル"
                        onChange={(e) => updateNoteRowLabel(row.id, e.target.value)}
                      />
                      <div className="roster-grid__time-cell-tools">
                        <button type="button" className="roster-grid__required-btn" onClick={() => removeRow(row.id)}>−</button>
                        <button type="button" className="roster-grid__required-btn" onClick={() => setAddMenuRowId((c) => c === row.id ? null : row.id)}>＋</button>
                        {addMenuRowId === row.id ? (
                          <div className={isTopBodyRow ? "roster-grid__add-row-menu roster-grid__add-row-menu--down" : "roster-grid__add-row-menu"}>
                            <button type="button" onClick={() => addScheduleRowAfter(row.id)}>スケジュール行</button>
                            <button type="button" onClick={() => addNoteRowAfter(row.id)}>備考行</button>
                          </div>
                        ) : null}
                      </div>
                    </th>
                    {classrooms.map((classroom) => (
                      <td key={`${row.id}-${classroom.id}`} className="roster-grid__note-cell"
                        style={{ width: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined, minWidth: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.8rem", padding: "0 8px" }}>—</span>
                      </td>
                    ))}
                  </tr>
                );
              }

              return (
                <tr key={row.id} className="roster-grid__body-row">
                  <th className={addMenuRowId === row.id ? "roster-grid__time roster-grid__time--menu-open" : "roster-grid__time"} scope="row">
                    <div className="roster-grid__time-editor">
                      <input
                        type="time"
                        step={1800}
                        className="roster-grid__time-input"
                        value={row.timeSlot}
                        onChange={(e) => updateTimeSlotAt(row.id, e.target.value)}
                      />
                    </div>
                    <div className="roster-grid__time-cell-tools">
                      <button type="button" className="roster-grid__required-btn" onClick={() => removeRow(row.id)}>−</button>
                      <button type="button" className="roster-grid__required-btn" onClick={() => setAddMenuRowId((c) => c === row.id ? null : row.id)}>＋</button>
                      {addMenuRowId === row.id ? (
                        <div className={isTopBodyRow ? "roster-grid__add-row-menu roster-grid__add-row-menu--down" : "roster-grid__add-row-menu"}>
                          <button type="button" onClick={() => addScheduleRowAfter(row.id)}>スケジュール行</button>
                          <button type="button" onClick={() => addNoteRowAfter(row.id)}>備考行</button>
                        </div>
                      ) : null}
                    </div>
                  </th>
                  {classrooms.map((classroom) => {
                    const count = getSlotCount(row.id, classroom.id);
                    return (
                      <td
                        key={`${classroom.id}-${row.id}`}
                        className="roster-grid__cell"
                        style={{ width: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined, minWidth: columnWidths[classroom.id] ? `${columnWidths[classroom.id]}px` : undefined }}
                      >
                        <div className="roster-grid__required-controls">
                          <button type="button" className="roster-grid__required-btn" onClick={() => changeSlotCount(row.id, classroom.id, -1)}>−</button>
                          <button type="button" className="roster-grid__required-btn" onClick={() => changeSlotCount(row.id, classroom.id, 1)}>＋</button>
                        </div>
                        <div className="roster-grid__editors" style={{ minHeight: 32 }}>
                          {count === 0 ? (
                            <span className="roster-grid__empty">—</span>
                          ) : (
                            Array.from({ length: count }, (_, i) => (
                              <div
                                key={i}
                                style={{
                                  height: 28,
                                  background: "var(--surface-2, #f4f4f5)",
                                  borderRadius: 4,
                                  margin: "2px 0",
                                  display: "flex",
                                  alignItems: "center",
                                  paddingLeft: 8,
                                  color: "var(--muted)",
                                  fontSize: "0.82rem",
                                }}
                              >
                                枠 {i + 1}
                              </div>
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
