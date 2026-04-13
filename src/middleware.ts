import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Page/API prefixes that require commercial edition (defense in depth vs export-time stripping). */
const COMMERCIAL_ONLY_PREFIXES: string[] = [
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

function isSimpleEdition(): boolean {
  const v = (
    process.env.MC_EDITION ||
    process.env.NEXT_PUBLIC_MC_EDITION ||
    "simple"
  ).toLowerCase();
  return v !== "commercial";
}

function isCommercialPath(pathname: string): boolean {
  for (const p of COMMERCIAL_ONLY_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

export function middleware(request: NextRequest): NextResponse {
  if (!isSimpleEdition()) {
    return NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  if (isCommercialPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Not available in Mission Control Simple (OSS) edition" },
        { status: 404 }
      );
    }
    return NextResponse.rewrite(new URL("/edition-not-available", request.url));
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
