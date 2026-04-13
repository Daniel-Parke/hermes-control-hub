/**
 * Hermes-compatible schedule parsing for Control Hub OSS.
 * Supports OSS-safe interval, cron, and one-shot formats only.
 */

import type { ParsedSchedule } from "./types";

export type { ParsedSchedule } from "./types";

function looksLikeCronExpression(s: string): boolean {
  const parts = s.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) return false;
  return parts.every((p) => p.length > 0 && !/\s/.test(p));
}

/**
 * Parse a schedule string for Hermes `jobs.json` (OSS surface).
 */
export function parseScheduleOss(raw: string): ParsedSchedule {
  const s = (typeof raw === "string" ? raw : "").trim();

  if (!s) {
    return { kind: "invalid", raw: "", message: "Schedule is empty" };
  }

  const simpleIntervalMatch = s.match(/^(?:every\s+)?(\d+)\s*(m|min|minutes?|h|hr|hours?)$/i);
  if (simpleIntervalMatch) {
    const n = parseInt(simpleIntervalMatch[1], 10);
    const unit = simpleIntervalMatch[2].toLowerCase();
    const minutes = unit.startsWith("h") ? n * 60 : n;
    return { kind: "interval", minutes, display: `every ${minutes}m` };
  }

  if (looksLikeCronExpression(s)) {
    return { kind: "cron", expr: s, display: s };
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return { kind: "once", run_at: s, display: s };
  }

  return {
    kind: "invalid",
    raw: s,
    message: `Unrecognized schedule: ${s.slice(0, 120)}`,
  };
}
