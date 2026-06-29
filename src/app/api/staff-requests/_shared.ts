import { type SessionData, type UserRole } from "@/lib/auth-session";
import {
  type StaffRequestOwner,
  type StaffRequestTypeLabel,
  type StaffRequestWriteInput,
} from "@/lib/staff-request-db";
import { getAuthAccountByUserId } from "@/lib/user-db";
import { isValidCalendarDate } from "@/lib/nursery-time";

export type RequestContext = StaffRequestOwner & { role: UserRole };

export const REQUEST_TYPES = new Set<StaffRequestTypeLabel>([
  "休み希望",
  "出勤希望",
  "時間相談",
]);

export const VALID_TIMES = new Set([
  "終日",
  "午前のみ",
  "午後のみ",
  "早番希望",
  "遅番不可",
]);

export function parseWriteBody(body: unknown): StaffRequestWriteInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const date = typeof payload.date === "string" ? payload.date : "";
  const type = payload.type;
  const time = typeof payload.time === "string" ? payload.time.trim() : "";
  const memo = typeof payload.memo === "string" ? payload.memo : "";

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !isValidCalendarDate(date) ||
    typeof type !== "string" ||
    !REQUEST_TYPES.has(type as StaffRequestTypeLabel) ||
    !VALID_TIMES.has(time) ||
    memo.length > 200
  ) {
    return null;
  }

  return {
    date,
    type: type as StaffRequestTypeLabel,
    time,
    memo,
  };
}

export async function getRequestOwner(
  session: SessionData,
): Promise<RequestContext | null> {
  const account = await getAuthAccountByUserId(session.userId);
  if (!account) {
    return null;
  }

  return {
    nurseryId: account.nurseryId,
    userId: account.userId,
    staffId: account.staffId,
    role: account.role,
  };
}
