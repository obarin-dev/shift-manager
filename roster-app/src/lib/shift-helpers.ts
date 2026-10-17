// roster-appはシフト表ドメインのロジックを持たないため、体制表の表示で
// 必要な最小限のヘルパーだけをここに置く(本体のshift-helpers.tsの一部)。
export function getStaffSurname(name: string) {
  const trimmed = name.trim();
  const parts = trimmed.split(/[\s　]+/).filter(Boolean);
  return parts[0] ?? trimmed;
}
