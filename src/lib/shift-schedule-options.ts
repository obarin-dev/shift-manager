import type { ShiftTypeDefinition } from "@/lib/nursery-helpers";
import { shiftTypeColorToCellStyle } from "@/lib/shift-type-colors";

/** 休み（勤務区分マスタ外） */
export const SHIFT_CELL_OFF = "off";

export type ShiftCellValue = string;

export type ShiftCellOption = {
  value: ShiftCellValue;
  label: string;
  title: string;
};

export type ShiftLegendItem = {
  value: ShiftCellValue;
  label: string;
  description: string;
  color: string;
  textColor: string;
};

const LEGEND_OFF_COLOR = "#F1F5F9";

const CODE_SHORT_LABELS: Record<string, string> = {
  early: "早",
  day: "日",
  late: "遅",
  extended: "延",
  other: "他",
};

function activeShiftTypes(shiftTypes: ShiftTypeDefinition[]) {
  return [...shiftTypes]
    .filter((shift) => shift.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function getShiftLegendDescription(shift: ShiftTypeDefinition) {
  return `${shift.name}（${shift.start}〜${shift.end}）`;
}

function findHShiftId(shiftTypes: ShiftTypeDefinition[]) {
  return shiftTypes.find((shift) => shift.name.trim().toUpperCase() === "H")?.id ?? null;
}

export function getShiftShortLabel(shift: Pick<ShiftTypeDefinition, "name" | "code">) {
  const trimmed = shift.name.trim();
  if (trimmed.length <= 2) {
    return trimmed;
  }

  return CODE_SHORT_LABELS[shift.code] ?? trimmed.slice(0, 2);
}

/** 勤務区分マスタの有効な区分 + 休み */
export function buildShiftCellOptions(
  shiftTypes: ShiftTypeDefinition[],
): ShiftCellOption[] {
  return [
    { value: SHIFT_CELL_OFF, label: "休", title: "休み" },
    ...activeShiftTypes(shiftTypes).map((shift) => ({
      value: shift.id,
      label: getShiftShortLabel(shift),
      title: getShiftLegendDescription(shift),
    })),
  ];
}

export function getShiftCellClassName(
  cellValue: ShiftCellValue | null,
  shiftTypeById: Map<string, ShiftTypeDefinition>,
) {
  if (!cellValue) {
    return "shift-schedule-grid__cell is-empty";
  }

  if (cellValue === SHIFT_CELL_OFF) {
    return "shift-schedule-grid__cell is-off";
  }

  const shiftType = shiftTypeById.get(cellValue);
  if (!shiftType) {
    return "shift-schedule-grid__cell is-empty";
  }

  return "shift-schedule-grid__cell is-themed";
}

export function getShiftCellInlineStyle(
  cellValue: ShiftCellValue | null,
  shiftTypeById: Map<string, ShiftTypeDefinition>,
) {
  if (!cellValue || cellValue === SHIFT_CELL_OFF) {
    return undefined;
  }

  const shiftType = shiftTypeById.get(cellValue);
  if (!shiftType?.color) {
    return undefined;
  }

  return shiftTypeColorToCellStyle(shiftType.color);
}

export function getShiftCellDisplayLabel(
  cellValue: ShiftCellValue | null,
  shiftTypeById: Map<string, ShiftTypeDefinition>,
) {
  if (!cellValue) {
    return "—";
  }

  if (cellValue === SHIFT_CELL_OFF) {
    return "休";
  }

  const shiftType = shiftTypeById.get(cellValue);
  if (shiftType) {
    return getShiftShortLabel(shiftType);
  }

  return "—";
}

/** 旧データ（code / extended）を id または休みに寄せる */
export function normalizeShiftCellValue(
  cellValue: string | null | undefined,
  shiftTypes: ShiftTypeDefinition[],
): ShiftCellValue | null {
  if (!cellValue) {
    return null;
  }

  if (cellValue === SHIFT_CELL_OFF) {
    return SHIFT_CELL_OFF;
  }

  if (cellValue === "extended") {
    return findHShiftId(shiftTypes);
  }

  if (shiftTypes.some((shift) => shift.id === cellValue)) {
    return cellValue;
  }

  const byCode = shiftTypes.find((shift) => shift.code === cellValue);
  return byCode?.id ?? null;
}

export function buildShiftLegendItems(
  shiftTypes: ShiftTypeDefinition[],
): ShiftLegendItem[] {
  return [
    {
      value: SHIFT_CELL_OFF,
      label: "休",
      description: "休み",
      color: LEGEND_OFF_COLOR,
      textColor: "#64748B",
    },
    ...activeShiftTypes(shiftTypes).map((shift) => {
      const style = shiftTypeColorToCellStyle(shift.color);
      return {
        value: shift.id,
        label: getShiftShortLabel(shift),
        description: getShiftLegendDescription(shift),
        color: style.backgroundColor,
        textColor: style.color,
      };
    }),
  ];
}

export function buildRotationValues(shiftTypes: ShiftTypeDefinition[]): ShiftCellValue[] {
  return [...activeShiftTypes(shiftTypes).map((shift) => shift.id), SHIFT_CELL_OFF];
}
