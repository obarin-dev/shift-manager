import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionTokenEdge } from "@/lib/auth-edge";

const PUBLIC_PATHS = ["/login", "/setup"];
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/setup/status", "/api/setup"];

const ADMIN_MANAGER_ONLY_PATHS = ["/shifts", "/roster", "/requests", "/nursery"];

function isAdminManagerOnlyPath(pathname: string) {
  return ADMIN_MANAGER_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// Token format: randomBytes(20).toString("hex") = 40 lowercase hex chars (see invitation-db.ts generateToken)
function isPublicRegisterPage(pathname: string) {
  return /^\/register\/[0-9a-f]{40}$/.test(pathname);
}

// POST only — this path exemption is method-agnostic; do not add GET/DELETE handlers here without adding auth
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
  const session = token ? await verifySessionTokenEdge(token) : null;

  if ((pathname === "/login" || pathname === "/setup") && session) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!isPublicPath(pathname) && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
      const statusUrl = new URL("/api/setup/status", request.url);
      const statusRes = await fetch(statusUrl);
      if (statusRes.ok) {
        const { setupRequired } = (await statusRes.json()) as { setupRequired?: boolean };
        if (setupRequired) {
          return NextResponse.redirect(new URL("/setup", request.url));
        }
      }
    } catch {
      // DB 未接続などのエラー時は /login へのフォールバックで続行
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.role === "staff" && isAdminManagerOnlyPath(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
