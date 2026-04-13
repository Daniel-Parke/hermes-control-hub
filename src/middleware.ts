import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Page/API prefixes intentionally not available in OSS. */
const RESTRICTED_PREFIXES: string[] = [
  "/operations",
  "/task-lists",
  "/workspaces",
  "/packages",
  "/command-room",
  "/api/operations",
  "/api/task-lists",
  "/api/workspaces",
  "/api/packages",
];

function isRestrictedPath(pathname: string): boolean {
  for (const p of RESTRICTED_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (isRestrictedPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Not available in this OSS build" },
        { status: 404 }
      );
    }
    return NextResponse.redirect(new URL("/edition-not-available", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/operations",
    "/operations/:path*",
    "/task-lists",
    "/task-lists/:path*",
    "/workspaces",
    "/workspaces/:path*",
    "/packages",
    "/packages/:path*",
    "/command-room",
    "/command-room/:path*",
    "/api/operations",
    "/api/operations/:path*",
    "/api/task-lists",
    "/api/task-lists/:path*",
    "/api/workspaces",
    "/api/workspaces/:path*",
    "/api/packages",
    "/api/packages/:path*",
  ],
};
