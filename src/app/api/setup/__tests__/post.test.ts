import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/setup-db", () => ({
  createInitialSetup: vi.fn(),
  SetupAlreadyDoneError: class SetupAlreadyDoneError extends Error {
    constructor() {
      super("Setup has already been completed");
      this.name = "SetupAlreadyDoneError";
    }
  },
}));

import { createInitialSetup, SetupAlreadyDoneError } from "@/lib/setup-db";
import { POST } from "../route";

const mockCreateInitialSetup = vi.mocked(createInitialSetup);

const VALID_BODY = {
  nurseryName: "星の子保育園",
  address: "東京都",
  phoneNumber: "03-1234-5678",
  openTime: "07:00",
  closeTime: "18:00",
  adminName: "管理者",
  adminEmail: "admin@example.com",
  adminPassword: "password123",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 on successful setup", async () => {
    mockCreateInitialSetup.mockResolvedValue(undefined);
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("returns 409 when setup already done", async () => {
    mockCreateInitialSetup.mockRejectedValue(new SetupAlreadyDoneError());
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toBe("already_setup");
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(makeRequest({ nurseryName: "", openTime: "07:00", closeTime: "18:00" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, adminEmail: "not-an-email" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, adminPassword: "short" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const request = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 500 on unexpected DB error", async () => {
    mockCreateInitialSetup.mockRejectedValue(new Error("DB error"));
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
  });
});
