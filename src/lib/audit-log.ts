// ═══════════════════════════════════════════════════════════════
// Lightweight audit trail (no secrets)
// ═══════════════════════════════════════════════════════════════

import { appendFileSync, existsSync, mkdirSync } from "fs";

import { PATHS } from "@/lib/hermes";

function ensureLogsDir(): void {
  const dir = PATHS.logs;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Append one JSON line: { ts, action, resource, ok, detail? }.
 */
export function appendAuditLine(entry: {
  action: string;
  resource: string;
  ok: boolean;
  detail?: string;
}): void {
  try {
    ensureLogsDir();
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        ...entry,
      }) + "\n";
    appendFileSync(PATHS.logs + "/mc-audit.log", line, "utf-8");
  } catch {
    // never throw from audit
  }
}
