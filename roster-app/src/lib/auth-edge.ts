/**
 * 本体(shiftmanager)の src/lib/auth-edge.ts と同じ実装。
 * AUTH_SECRET を共有することで、本体で発行されたセッションCookieを
 * このアプリでもそのまま検証できる(SSO的な扱い)。
 */
import { jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "shift_session";

export const VALID_ROLE_VALUES = ["admin", "manager", "staff"] as const;
const VALID_ROLES = new Set<string>(VALID_ROLE_VALUES);

export type EdgeSessionData = {
  userId: string;
  nurseryId: string;
  role: string;
  email: string;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new AuthConfigError("AUTH_SECRET environment variable is required in production.");
  }

  return new TextEncoder().encode(secret ?? "dev-only-shift-manager-auth-secret");
}

export async function verifySessionTokenEdge(token: string): Promise<EdgeSessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());

    if (
      typeof payload.userId !== "string" ||
      typeof payload.nurseryId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      !VALID_ROLES.has(payload.role)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      nurseryId: payload.nurseryId,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
