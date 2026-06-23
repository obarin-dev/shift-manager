"use client";

import type { Classroom } from "@/lib/mock-classes";
import {
  dailyChildCountKey,
  getTodayChildCount,
  parseDailyChildCountInput,
} from "@/lib/mock-roster";

type RosterClassColumnHeaderProps = {
  classroom: Classroom;
  focusDate: string;
  dailyChildCounts: Record<string, number>;
  onTodayCountChange: (classroomId: string, count: number) => void;
  onTodayCountReset: (classroomId: string) => void;
};

export function RosterClassColumnHeader({
  classroom,
  focusDate,
  dailyChildCounts,
  onTodayCountChange,
  onTodayCountReset,
}: RosterClassColumnHeaderProps) {
  const todayCount = getTodayChildCount(dailyChildCounts, focusDate, classroom);

  const todayCountLabel =
    todayCount === "" ? null : ` / 今日 ${todayCount}名`;

  return (
    <>
      <span className="roster-grid__class-name">{classroom.name}</span>
      <span className="roster-grid__class-print-meta roster-print-only">
        登録 {classroom.childCount}名
        {todayCountLabel ?? ""}
      </span>
      <div className="roster-grid__today-count no-print">
        <span className="roster-grid__class-meta">登録 {classroom.childCount}名</span>
        <label className="roster-grid__today-count-field">
          <span className="roster-grid__today-count-label">今日</span>
          <input
            type="number"
            className="roster-grid__today-count-input"
            min={0}
            max={99}
            inputMode="numeric"
            aria-label={`${classroom.name}の今日の園児数`}
            value={todayCount}
            onChange={(event) => {
              const parsed = parseDailyChildCountInput(event.target.value);
              if (parsed === null) {
                return;
              }
              if (parsed === "") {
                onTodayCountReset(classroom.id);
                return;
              }
              onTodayCountChange(classroom.id, parsed);
            }}
          />
          <span className="roster-grid__today-count-suffix">名</span>
        </label>
      </div>
    </>
  );
}
