import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PATHS = ["/api/auth/login"];

function isPublicRegisterPage(pathname: string) {
  return /^\/register\/[0-9a-f]{40}$/.test(pathname);
}

function isPublicApiInvitation(pathname: string) {
  return /^\/api\/invitations\/[0-9a-f]{40}\/register$/.test(pathname);
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }

  if (isPublicRegisterPage(pathname)) {
    return true;
  }

  if (isPublicApiInvitation(pathname)) {
    return true;
  }

  return PUBLIC_API_PATHS.some((path) => pathname === path);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!isPublicPath(pathname) && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
