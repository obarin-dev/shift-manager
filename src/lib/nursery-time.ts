/** PostgreSQL TIME 列（UTC 1970-01-01 基準）を "HH:MM" に変換 */
export function formatDbTime(value: Date): string {
  const hours = value.getUTCHours().toString().padStart(2, "0");
  const minutes = value.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "HH:MM" を Prisma の TIME 用 Date に変換 */
export function parseTimeToDate(time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(1970, 0, 1, hours, minutes ?? 0, 0));
}

/** PostgreSQL DATE 列を "YYYY-MM-DD" に変換 */
export function formatDbDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM-DD" を Prisma の DATE 用 Date に変換 */
export function parseDateToDb(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

/** "YYYY-MM-DD" 文字列が暦として有効かを検証する（例: 2026-02-30 は false） */
export function isValidCalendarDate(date: string): boolean {
  const d = new Date(`${date}T12:00:00.000Z`);
  if (isNaN(d.getTime())) return false;
  const [year, month, day] = date.split("-").map(Number);
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}
