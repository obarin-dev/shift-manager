import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { UserRole } from "@/generated/prisma/client";
export type { UserRole };

import {
  SESSION_COOKIE_NAME,
  AuthConfigError,
  getAuthSecret,
} from "@/lib/auth-edge";

export { SESSION_COOKIE_NAME, AuthConfigError };

const VALID_ROLES = new Set<string>(Object.values(UserRole));

export function isValidUserRole(role: string): role is UserRole {
  return VALID_ROLES.has(role);
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionData = {
  userId: string;
  nurseryId: string;
  role: UserRole;
  email: string;
};

export async function createSessionToken(data: SessionData) {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());

    if (
      typeof payload.userId !== "string" ||
      typeof payload.nurseryId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      !isValidUserRole(payload.role)
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

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function setSessionCookie(data: SessionData) {
  const token = await createSessionToken(data);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token));
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
