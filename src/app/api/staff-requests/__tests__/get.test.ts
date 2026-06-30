import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { AdminStaffRequestGroup, StaffRequestPayload } from "@/lib/staff-request-db";

vi.mock("@/lib/auth-session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/user-db", () => ({
  getAuthAccountByUserId: vi.fn(),
}));

vi.mock("@/lib/staff-request-db", () => ({
  listStaffRequests: vi.fn(),
  listAdminStaffRequestGroups: vi.fn(),
  listAdminStaffRequestGroupsForMonth: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { getAuthAccountByUserId } from "@/lib/user-db";
import {
  listStaffRequests,
  listAdminStaffRequestGroups,
  listAdminStaffRequestGroupsForMonth,
} from "@/lib/staff-request-db";
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

const ADMIN_ACCOUNT = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  staffId: "staff-admin-1",
  role: "admin" as const,
  roleLabel: "管理者",
  email: "admin@example.com",
  displayName: "管理者",
};

const STAFF_ACCOUNT = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  staffId: "staff-1",
  role: "staff" as const,
  roleLabel: "スタッフ",
  email: "staff@example.com",
  displayName: "スタッフ",
};

const SAMPLE_GROUPS: AdminStaffRequestGroup[] = [
  {
    staffId: "staff-1",
    staffName: "山田太郎",
    requests: [
      {
        id: "req-1",
        date: "2026-07-10",
        type: "休み希望",
        time: "終日",
        memo: "",
        status: "提出済み",
        staffName: "山田太郎",
        userId: "user-staff-1",
        staffId: "staff-1",
        submittedAt: "2026-06-30T00:00:00.000Z",
      },
    ],
  },
];

const SAMPLE_STAFF_REQUESTS: StaffRequestPayload[] = [
  {
    id: "req-2",
    date: "2026-07-15",
    type: "出勤希望",
    time: "終日",
    memo: "",
    status: "提出済み",
  },
];

function makeRequest(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/staff-requests", () => {
  describe("スタッフ向け（scope なし）", () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
      vi.mocked(getAuthAccountByUserId).mockResolvedValue(STAFF_ACCOUNT);
      vi.mocked(listStaffRequests).mockResolvedValue(SAMPLE_STAFF_REQUESTS);
    });

    it("200 と自分の申請一覧を返す", async () => {
      const res = await GET(makeRequest("http://localhost/api/staff-requests"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("req-2");
    });

    it("listStaffRequests が呼ばれる（今日以降フィルタはDB層で実施）", async () => {
      await GET(makeRequest("http://localhost/api/staff-requests"));
      expect(listStaffRequests).toHaveBeenCalledOnce();
      expect(listAdminStaffRequestGroups).not.toHaveBeenCalled();
    });

    it("未認証: 401 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const res = await GET(makeRequest("http://localhost/api/staff-requests"));
      expect(res.status).toBe(401);
    });
  });

  describe("管理者向け（scope=admin）", () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      vi.mocked(getAuthAccountByUserId).mockResolvedValue(ADMIN_ACCOUNT);
      vi.mocked(listAdminStaffRequestGroups).mockResolvedValue(SAMPLE_GROUPS);
      vi.mocked(listAdminStaffRequestGroupsForMonth).mockResolvedValue(SAMPLE_GROUPS);
    });

    it("month なし: listAdminStaffRequestGroups を呼ぶ（今日以降フィルタ済み）", async () => {
      const res = await GET(makeRequest("http://localhost/api/staff-requests?scope=admin"));
      expect(res.status).toBe(200);
      expect(listAdminStaffRequestGroups).toHaveBeenCalledWith("nursery-hoshinoko");
      expect(listAdminStaffRequestGroupsForMonth).not.toHaveBeenCalled();
    });

    it("month あり: listAdminStaffRequestGroupsForMonth を呼ぶ（今日フィルタなし）", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin&month=2026-07"),
      );
      expect(res.status).toBe(200);
      expect(listAdminStaffRequestGroupsForMonth).toHaveBeenCalledWith(
        "nursery-hoshinoko",
        "2026-07",
      );
      expect(listAdminStaffRequestGroups).not.toHaveBeenCalled();
    });

    it("month あり: 200 と申請グループを返す", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin&month=2026-07"),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].staffId).toBe("staff-1");
    });

    it("不正な month フォーマット: 400 を返す", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin&month=202607"),
      );
      expect(res.status).toBe(400);
    });

    it("month の月が 0: 400 を返す", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin&month=2026-00"),
      );
      expect(res.status).toBe(400);
    });

    it("month の月が 13: 400 を返す", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin&month=2026-13"),
      );
      expect(res.status).toBe(400);
    });

    it("manager ロール: 200 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue({ ...ADMIN_SESSION, role: "manager" });
      vi.mocked(getAuthAccountByUserId).mockResolvedValue({ ...ADMIN_ACCOUNT, role: "manager" });
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin"),
      );
      expect(res.status).toBe(200);
    });

    it("staff ロール: 403 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
      vi.mocked(getAuthAccountByUserId).mockResolvedValue(STAFF_ACCOUNT);
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin"),
      );
      expect(res.status).toBe(403);
    });

    it("未認証: 401 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const res = await GET(
        makeRequest("http://localhost/api/staff-requests?scope=admin"),
      );
      expect(res.status).toBe(401);
    });

    it("DB エラー: 500 を返す", async () => {
      vi.mocked(listAdminStaffRequestGroups).mockRejectedValue(new Error("db error"));
      const res = await GET(makeRequest("http://localhost/api/staff-requests?scope=admin"));
      expect(res.status).toBe(500);
    });
  });
});
