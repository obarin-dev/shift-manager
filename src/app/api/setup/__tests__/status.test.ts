import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/setup-db", () => ({
  isSetupRequired: vi.fn(),
}));

import { isSetupRequired } from "@/lib/setup-db";
import { GET } from "../status/route";

const mockIsSetupRequired = vi.mocked(isSetupRequired);

describe("GET /api/setup/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns setupRequired: true when no nursery exists", async () => {
    mockIsSetupRequired.mockResolvedValue(true);
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ setupRequired: true });
  });

  it("returns setupRequired: false when nursery exists", async () => {
    mockIsSetupRequired.mockResolvedValue(false);
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ setupRequired: false });
  });

  it("returns 500 on DB error", async () => {
    mockIsSetupRequired.mockRejectedValue(new Error("DB error"));
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
