import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { getChApiKeyFromEnv } from "@agent-control-hub/config";
import { NextRequest, NextResponse } from "next/server";

function firstEnvFlag(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return undefined;
}

export function getChApiKey(): string {
  return getChApiKeyFromEnv();
}

export function isDeployApiEnabled(): boolean {
  const raw = firstEnvFlag(["CH_ENABLE_DEPLOY_API"]);
  const value = raw?.toLowerCase();
  if (value === "1" || value === "true" || value === "yes") return true;
  if (value === "0" || value === "false" || value === "no") return false;
  return process.env.NODE_ENV !== "production";
}

export function isChReadOnly(): boolean {
  const raw = firstEnvFlag(["CH_READ_ONLY"]);
  const value = raw?.toLowerCase();
  return value === "1" || value === "true";
}

export function requireChApiKey(request: NextRequest): NextResponse | null {
  const provided =
    request.headers.get("x-ch-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  const scopedRaw = process.env.CH_API_KEYS_SCOPED_JSON;
  if (scopedRaw) {
    try {
      const scoped = JSON.parse(scopedRaw) as Record<string, string[]>;
      const scopes = scoped[provided];
      if (!scopes) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const required = request.method === "GET" ? "read" : "write";
      if (!scopes.includes(required) && !scopes.includes("admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return null;
    } catch {
      return NextResponse.json({ error: "Invalid key scope configuration" }, { status: 500 });
    }
  }
  const legacy = getChApiKey();
  if (!legacy) return null;
  if (provided !== legacy) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function getCorrelationId(request: NextRequest): string {
  return (
    request.headers.get("x-correlation-id") ||
    request.headers.get("x-request-id") ||
    randomUUID()
  );
}

export function requireSignedRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.CH_REQUEST_SIGNING_SECRET || "";
  if (!secret) return null;
  const ts = request.headers.get("x-ch-ts") || "";
  const sig = request.headers.get("x-ch-signature") || "";
  if (!ts || !sig) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }
  const ageMs = Math.abs(Date.now() - Number(ts));
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Signature timestamp expired" }, { status: 401 });
  }
  const payload = `${request.method}:${request.nextUrl.pathname}:${ts}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const lhs = Buffer.from(sig);
  const rhs = Buffer.from(expected);
  if (lhs.length !== rhs.length || !timingSafeEqual(lhs, rhs)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  return null;
}

export function requireNotReadOnly(): NextResponse | null {
  if (!isChReadOnly()) return null;
  return NextResponse.json(
    { error: "Control Hub is in read-only mode (set CH_READ_ONLY=true to allow writes)." },
    { status: 503 }
  );
}

export function requireDeployApiEnabled(): NextResponse | null {
  if (isDeployApiEnabled()) return null;
  return NextResponse.json(
    { error: "Deploy API disabled. Set CH_ENABLE_DEPLOY_API=true to allow update/restart." },
    { status: 403 }
  );
}

// Backward-compatible aliases.
export const getMcApiKey = getChApiKey;
export const isMcReadOnly = isChReadOnly;
export const requireMcApiKey = requireChApiKey;
