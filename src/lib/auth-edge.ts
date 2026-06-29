/**
 * Edge Runtime compatible auth utilities (no Prisma imports).
 * Used by src/middleware.ts which runs in the Edge Runtime.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "shift_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

// Keep in sync with the UserRole enum in prisma/schema.prisma
const VALID_ROLES = new Set(["admin", "manager", "staff"]);

export type EdgeSessionData = {
  userId: string;
  nurseryId: string;
  role: string;
  email: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
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
