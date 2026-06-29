/**
 * Edge Runtime compatible auth utilities (no Prisma imports).
 * Used by src/middleware.ts which runs in the Edge Runtime.
 * SESSION_COOKIE_NAME is the single source of truth — auth-session.ts imports from here.
 */
import { jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "shift_session";

// Must stay in sync with the UserRole enum in prisma/schema.prisma.
// Prisma cannot be imported in Edge Runtime, so the values are listed explicitly.
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
