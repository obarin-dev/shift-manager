/** 勤務表セル用の色プリセット */
export const SHIFT_COLOR_PRESETS = [
  { id: "yellow", label: "黄", value: "#FEF08A" },
  { id: "amber", label: "橙", value: "#FED7AA" },
  { id: "green", label: "緑", value: "#BBF7D0" },
  { id: "blue", label: "青", value: "#BFDBFE" },
  { id: "purple", label: "紫", value: "#E9D5FF" },
  { id: "pink", label: "桃", value: "#FBCFE8" },
  { id: "gray", label: "灰", value: "#E2E8F0" },
] as const;

export const DEFAULT_SHIFT_TYPE_COLOR = SHIFT_COLOR_PRESETS[0].value;

const CODE_DEFAULT_COLORS: Record<string, string> = {
  early: "#BFDBFE",
  day: "#BBF7D0",
  late: "#FED7AA",
  other: "#FEF08A",
};

export function getDefaultColorForShiftCode(code: string) {
  return CODE_DEFAULT_COLORS[code] ?? DEFAULT_SHIFT_TYPE_COLOR;
}

export function normalizeShiftColor(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return null;
  }

  return trimmed.toUpperCase();
}

function hexToRgb(hex: string) {
  const normalized = normalizeShiftColor(hex);
  if (!normalized) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function getReadableTextColor(backgroundHex: string) {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) {
    return "#1E293B";
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? "#1E293B" : "#FFFFFF";
}

export function shiftTypeColorToCellStyle(color: string) {
  const background = normalizeShiftColor(color) ?? DEFAULT_SHIFT_TYPE_COLOR;
  return {
    backgroundColor: background,
    color: getReadableTextColor(background),
  } as const;
}
