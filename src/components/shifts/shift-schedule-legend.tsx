"use client";

import type { ShiftLegendItem } from "@/lib/shift-schedule-options";

type ShiftScheduleLegendProps = {
  items: ShiftLegendItem[];
  className?: string;
};

export function ShiftScheduleLegend({ items, className }: ShiftScheduleLegendProps) {
  return (
    <div className={className ?? "shift-schedule-legend"}>
      <span className="shift-schedule-legend__title">凡例</span>
      <ul className="shift-schedule-legend__list">
        {items.map((item) => (
          <li key={item.value} className="shift-schedule-legend__item">
            <span
              className="shift-schedule-legend__swatch"
              style={{ backgroundColor: item.color, color: item.textColor }}
            >
              {item.label}
            </span>
            <span className="shift-schedule-legend__desc">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
