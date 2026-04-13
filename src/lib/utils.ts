// ═══════════════════════════════════════════════════════════════
// Shared Utility Functions
// ═══════════════════════════════════════════════════════════════

/** Capitalise the first letter of a string. */
export function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format an ISO timestamp as a relative time string ("5m ago", "2h ago", etc.)
 */
export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Format a future ISO timestamp as a relative duration ("5m", "2h 30m", etc.)
 */
export function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "< 1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

/**
 * Format bytes as human-readable size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate a string to a max length with ellipsis
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Session Message Summary ────────────────────────────────────

/**
 * Generate a short summary preview of message content.
 * Returns the first meaningful line, truncated to 120 chars.
 */
export function messageSummary(content: string | undefined): string {
  if (!content) return "(no content)";
  const lines = content.split("\n");
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || "";
  const firstIndex = lines.findIndex((l) => l.trim().length > 0);
  const hasMoreContent = firstIndex >= 0 && firstIndex < lines.length - 1;
  const trimmed = firstNonEmpty.slice(0, 120);
  return trimmed + (firstNonEmpty.length > 120 || hasMoreContent ? "..." : "");
}

// ── Schedule Parsing ──────────────────────────────────────────

/** Result of parsing a schedule string for Hermes `jobs.json` (see nested Hermes `parse_schedule`). */
export type ParsedSchedule =
  | { kind: "interval"; minutes: number; display: string }
  | { kind: "cron"; expr: string; display: string }
  | { kind: "once"; run_at: string; display: string }
  | { kind: "invalid"; raw: string; message: string };

function looksLikeCronExpression(s: string): boolean {
  const parts = s.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) return false;
  return parts.every((p) => p.length > 0 && !/\s/.test(p));
}

/**
 * Parse a schedule string into the structure the cron scheduler expects.
 * - "every 15m" / "every 2h" → interval
 * - Five- or six-field cron → cron (`expr` is the full string)
 * - ISO-8601 timestamp → once
 * - Unknown or empty → invalid (callers must reject for user-supplied input)
 */
export function parseSchedule(raw: string): ParsedSchedule {
  const s = (typeof raw === "string" ? raw : "").trim();

  if (!s) {
    return { kind: "invalid", raw: "", message: "Schedule is empty" };
  }

  // Rich interval patterns: "every 1h 30m", "every 2d", "every 1w 3d", etc.
  const richIntervalMatch = s.match(/^every\s+(\d+)\s*(m|h|d|w)(?:\s+(\d+)\s*(m|h))?$/);
  if (richIntervalMatch) {
    let minutes = parseInt(richIntervalMatch[1], 10);
    const unit1 = richIntervalMatch[2];
    if (unit1 === "h") minutes *= 60;
    else if (unit1 === "d") minutes *= 1440;
    else if (unit1 === "w") minutes *= 10080;
    if (richIntervalMatch[3]) {
      let extra = parseInt(richIntervalMatch[3], 10);
      if (richIntervalMatch[4] === "h") extra *= 60;
      minutes += extra;
    }
    const display = minutes >= 1440
      ? `every ${minutes / 1440}d`
      : minutes >= 60
        ? `every ${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
        : `every ${minutes}m`;
    return { kind: "interval", minutes, display };
  }

  // Simple interval patterns: "every 15m", "every 2h", "30m", "1h"
  const intervalMatch = s.match(/^(?:every\s+)?(\d+)\s*(m|min|minutes?|h|hr|hours?)$/i);
  if (intervalMatch) {
    const n = parseInt(intervalMatch[1], 10);
    const unit = intervalMatch[2].toLowerCase();
    const minutes = unit.startsWith("h") ? n * 60 : n;
    return { kind: "interval", minutes, display: `every ${minutes}m` };
  }

  // Cron: 5 fields (standard) or 6 fields (with seconds), space-separated
  if (looksLikeCronExpression(s)) {
    return { kind: "cron", expr: s, display: s };
  }

  // ISO timestamp → one-shot
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return { kind: "once", run_at: s, display: s };
  }

  return {
    kind: "invalid",
    raw: s,
    message: `Unrecognized schedule: ${s.slice(0, 120)}`,
  };
}

// ── Cron Job Types ────────────────────────────────────────────

export interface CronJobData {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  model: string;
  provider?: string;
  base_url?: string;
  profile?: string;
  timeout?: number;
  schedule: { kind: string; minutes?: number; expr?: string; run_at?: string; display?: string } | string;
  schedule_display?: string;
  repeat: { times: number | null; completed: number } | boolean;
  enabled: boolean;
  state?: string;
  deliver?: string;
  script?: string | null;
  created_at?: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  mission_id?: string;
  [key: string]: unknown;
}


