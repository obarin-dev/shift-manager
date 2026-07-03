import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/nursery-db", () => ({
  getActiveNurseryId: vi.fn().mockResolvedValue("nursery-hoshinoko"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nursery: { findUnique: vi.fn() },
    shiftType: { count: vi.fn() },
    staff: { count: vi.fn() },
    classroom: { count: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { GET } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const STAFF_SESSION: SessionData = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  role: "staff",
  email: "staff@example.com",
};

const mockGetSession = vi.mocked(getSession);
const mockNurseryFindUnique = vi.mocked(prisma.nursery.findUnique);
const mockShiftTypeCount = vi.mocked(prisma.shiftType.count);
const mockStaffCount = vi.mocked(prisma.staff.count);
const mockClassroomCount = vi.mocked(prisma.classroom.count);

beforeEach(() => {
  vi.clearAllMocks();
  mockShiftTypeCount.mockResolvedValue(0);
  mockStaffCount.mockResolvedValue(0);
  mockClassroomCount.mockResolvedValue(0);
});

describe("GET /api/onboarding/status", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when role is staff", async () => {
    mockGetSession.mockResolvedValue(STAFF_SESSION);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns all false when nursery has no data", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockNurseryFindUnique.mockResolvedValue({
      open_time: null,
      weekly_closed_weekdays: [],
      close_on_public_holidays: false,
    } as never);
    mockShiftTypeCount.mockResolvedValue(0);
    mockStaffCount.mockResolvedValue(0);
    mockClassroomCount.mockResolvedValue(0);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      nursingHours: false,
      shiftTypes: false,
      holidaySettings: false,
      staff: false,
      classes: false,
    });
  });

  it("returns nursingHours true when open_time is set", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockNurseryFindUnique.mockResolvedValue({
      open_time: new Date("1970-01-01T07:00:00Z"),
      weekly_closed_weekdays: [],
      close_on_public_holidays: false,
    } as never);

    const res = await GET();
    const body = await res.json();
    expect(body.nursingHours).toBe(true);
  });

  it("returns holidaySettings true when close_on_public_holidays is true", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockNurseryFindUnique.mockResolvedValue({
      open_time: null,
      weekly_closed_weekdays: [],
      close_on_public_holidays: true,
    } as never);

    const res = await GET();
    const body = await res.json();
    expect(body.holidaySettings).toBe(true);
  });

  it("returns holidaySettings true when weekly_closed_weekdays has entries", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockNurseryFindUnique.mockResolvedValue({
      open_time: null,
      weekly_closed_weekdays: ["sunday"],
      close_on_public_holidays: false,
    } as never);

    const res = await GET();
    const body = await res.json();
    expect(body.holidaySettings).toBe(true);
  });

  it("returns all true when all data is present", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockNurseryFindUnique.mockResolvedValue({
      open_time: new Date("1970-01-01T07:00:00Z"),
      weekly_closed_weekdays: ["sunday"],
      close_on_public_holidays: false,
    } as never);
    mockShiftTypeCount.mockResolvedValue(2);
    mockStaffCount.mockResolvedValue(3);
    mockClassroomCount.mockResolvedValue(1);

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({
      nursingHours: true,
      shiftTypes: true,
      holidaySettings: true,
      staff: true,
      classes: true,
    });
  });
});
