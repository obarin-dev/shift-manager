import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { RosterTemplatePayload } from "@/lib/roster-helpers";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/roster-template-db", () => ({
  getRosterTemplate: vi.fn(),
  saveRosterTemplate: vi.fn(),
  isRosterTemplatePayload: vi.fn((v: unknown) => {
    if (!v || typeof v !== "object") return false;
    const obj = v as Record<string, unknown>;
    return Array.isArray(obj.rows);
  }),
}));

import { getSession } from "@/lib/auth-session";
import { getRosterTemplate, saveRosterTemplate } from "@/lib/roster-template-db";
import { GET, PUT } from "../route";

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

const SAMPLE_TEMPLATE: RosterTemplatePayload = {
  rows: [
    { id: "row-1", kind: "schedule", timeSlot: "07:00" },
    { id: "row-2", kind: "schedule", timeSlot: "08:00" },
  ],
  slotCountsByRowAndClass: { "row-1:class-a": 2, "row-2:class-a": 1 },
};

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/roster/template", () => {
  it("未認証は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("staff ロールは 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("テンプレートが存在する場合は data を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getRosterTemplate).mockResolvedValue(SAMPLE_TEMPLATE);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(SAMPLE_TEMPLATE);
  });

  it("テンプレートが未保存の場合は data: null を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getRosterTemplate).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeNull();
  });

  it("内部エラーは 500 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getRosterTemplate).mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/roster/template", () => {
  it("未認証は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PUT(makeRequest("http://localhost/api/roster/template", {
      method: "PUT",
      body: JSON.stringify(SAMPLE_TEMPLATE),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(401);
  });

  it("staff ロールは 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    const res = await PUT(makeRequest("http://localhost/api/roster/template", {
      method: "PUT",
      body: JSON.stringify(SAMPLE_TEMPLATE),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(403);
  });

  it("rows がない場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await PUT(makeRequest("http://localhost/api/roster/template", {
      method: "PUT",
      body: JSON.stringify({ slotCountsByRowAndClass: {} }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
  });

  it("不正な JSON は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await PUT(makeRequest("http://localhost/api/roster/template", {
      method: "PUT",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });

  it("正常なペイロードは保存して ok: true を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(saveRosterTemplate).mockResolvedValue(undefined);
    const res = await PUT(makeRequest("http://localhost/api/roster/template", {
      method: "PUT",
      body: JSON.stringify(SAMPLE_TEMPLATE),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(saveRosterTemplate).toHaveBeenCalledWith({
      rows: SAMPLE_TEMPLATE.rows,
      slotCountsByRowAndClass: SAMPLE_TEMPLATE.slotCountsByRowAndClass,
    });
  });

  it("内部エラーは 500 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(saveRosterTemplate).mockRejectedValue(new Error("db error"));
    const res = await PUT(makeRequest("http://localhost/api/roster/template", {
      method: "PUT",
      body: JSON.stringify(SAMPLE_TEMPLATE),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(500);
  });
});
