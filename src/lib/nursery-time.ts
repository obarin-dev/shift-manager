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
