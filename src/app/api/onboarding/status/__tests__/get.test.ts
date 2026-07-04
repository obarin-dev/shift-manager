import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/nursery-db", () => ({
  getActiveNurseryId: vi.fn().mockResolvedValue("nursery-hoshinoko"),
  getOnboardingStatus: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { getOnboardingStatus } from "@/lib/nursery-db";
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

const ALL_FALSE = {
  nursingHours: false,
  shiftTypes: false,
  holidaySettings: false,
  staff: false,
  classes: false,
};

const ALL_TRUE = {
  nursingHours: true,
  shiftTypes: true,
  holidaySettings: true,
  staff: true,
  classes: true,
};

const mockGetSession = vi.mocked(getSession);
const mockGetOnboardingStatus = vi.mocked(getOnboardingStatus);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOnboardingStatus.mockResolvedValue(ALL_FALSE);
});

describe("GET /api/onboarding/status", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is staff", async () => {
    mockGetSession.mockResolvedValue(STAFF_SESSION);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns all false when nursery has no data", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetOnboardingStatus.mockResolvedValue(ALL_FALSE);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(ALL_FALSE);
  });

  it("returns nursingHours true when open_time is set", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetOnboardingStatus.mockResolvedValue({ ...ALL_FALSE, nursingHours: true });

    const res = await GET();
    const body = await res.json();
    expect(body.nursingHours).toBe(true);
  });

  it("returns holidaySettings true when close_on_public_holidays is true", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetOnboardingStatus.mockResolvedValue({ ...ALL_FALSE, holidaySettings: true });

    const res = await GET();
    const body = await res.json();
    expect(body.holidaySettings).toBe(true);
  });

  it("returns staff true when non-admin staff exist (including manager role)", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetOnboardingStatus.mockResolvedValue({ ...ALL_FALSE, staff: true });

    const res = await GET();
    const body = await res.json();
    expect(body.staff).toBe(true);
  });

  it("returns all true when all data is present", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetOnboardingStatus.mockResolvedValue(ALL_TRUE);

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual(ALL_TRUE);
  });
});
