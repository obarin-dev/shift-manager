import type { ReactNode } from "react";
import type { TodaySpecialEvent } from "@/lib/nursery-helpers";

type TodayScheduleHeaderProps = {
  dateLabel: string;
  items: TodaySpecialEvent[];
  actions?: ReactNode;
};

export function TodayScheduleHeader({
  dateLabel,
  items,
  actions,
}: TodayScheduleHeaderProps) {
  return (
    <header className="app-header today-schedule-header">
      <div className="app-header__top">
        <div className="app-header__heading">
          <p className="eyebrow">本日の予定</p>
          <h1>{dateLabel}</h1>
        </div>

        {actions ? <div className="app-header__actions">{actions}</div> : null}
      </div>

      {items.length === 0 ? (
        <p className="today-schedule-list__empty">本日の登録行事はありません。</p>
      ) : (
        <ol className="today-schedule-list" aria-label="本日の予定">
          {items.map((item) => (
            <li className="today-schedule-list__item" key={`${item.time}-${item.label}`}>
              <time className="today-schedule-list__time" dateTime={item.time}>
                {item.time}
              </time>
              <span className="today-schedule-list__label">{item.label}</span>
            </li>
          ))}
        </ol>
      )}
    </header>
  );
}
