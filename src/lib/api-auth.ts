// ═══════════════════════════════════════════════════════════════
// Optional API auth + feature flags for Mission Control
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

/** When set, mutating routes require this key (header X-MC-API-Key or Authorization: Bearer). */
export function getMcApiKey(): string {
  return (process.env.MC_API_KEY || "").trim();
}

/**
 * Deploy/update API. In production, requires MC_ENABLE_DEPLOY_API=true.
 * In non-production, defaults to enabled unless explicitly set to "false".
 */
export function isDeployApiEnabled(): boolean {
  const v = process.env.MC_ENABLE_DEPLOY_API?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return process.env.NODE_ENV === "production" ? false : true;
}

/** Read-only mode: block writes (except GET). */
export function isMcReadOnly(): boolean {
  const v = process.env.MC_READ_ONLY;
  return v === "1" || v === "true";
}

/**
 * Returns 401 response if MC_API_KEY is set and request lacks a valid key.
 * Returns null if authorized or auth disabled.
 */
export function requireMcApiKey(request: NextRequest): NextResponse | null {
  const key = getMcApiKey();
  if (!key) return null;

  const header =
    request.headers.get("x-mc-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  if (header !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireNotReadOnly(): NextResponse | null {
  if (isMcReadOnly()) {
    return NextResponse.json(
      { error: "Mission Control is in read-only mode (MC_READ_ONLY)" },
      { status: 503 }
    );
  }
  return null;
}

export function requireDeployApiEnabled(): NextResponse | null {
  if (!isDeployApiEnabled()) {
    return NextResponse.json(
      {
        error:
          "Deploy API disabled. Set MC_ENABLE_DEPLOY_API=true to allow update/restart.",
      },
      { status: 403 }
    );
  }
  return null;
}
