// ═══════════════════════════════════════════════════════════════
// Shared Utility Functions
// ═══════════════════════════════════════════════════════════════

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

// ── Mission Progress ───────────────────────────────────────────
export type StepState = "done" | "active" | "pending" | "failed";

export interface ProgressStep {
  label: string;
  state: StepState;
}

/**
 * Calculate the 3-step progress indicator for a mission.
 *
 * Steps: [Queued/Dispatched] → [Processing] → [Done]
 *
 * - For cron jobs, step 1 is "Queued" (waiting for trigger time)
 * - For one-shot dispatches, step 1 is "Dispatched" (sent immediately)
 * - "Processing" replaces the old "Working" label for clarity
 */
export function getMissionProgressSteps(
  status: string,
  dispatchMode?: string,
  cronState?: string
): ProgressStep[] {
  const firstLabel = dispatchMode === "cron" ? "Queued" : "Dispatched";
  const steps: ProgressStep[] = [
    { label: firstLabel, state: "pending" },
    { label: "Processing", state: "pending" },
    { label: "Done", state: "pending" },
  ];

  if (status === "completed") {
    steps[0].state = "done";
    steps[1].state = "done";
    steps[2].state = "done";
  } else if (status === "failed") {
    steps[0].state = "done";
    steps[1].state = "failed";
    steps[2].state = "failed";
  } else if (status === "running" || cronState === "active" || cronState === "running") {
    steps[0].state = "done";
    steps[1].state = "active";
  } else {
    // dispatched / queued / scheduled
    steps[0].state = "active";
  }

  return steps;
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

/**
 * Parse a schedule string into the structure the cron scheduler expects.
 * - "every 15m" / "every 2h" → { kind: "interval", minutes: N, display }
 * - "0 * /2 * * *" (cron expr) → { kind: "cron", expr, display }
 * - "2026-04-09T12:00:00Z"   → { kind: "once", run_at: "...", display }
 *
 * Shared between cron/route.ts and missions/route.ts.
 */
export function parseSchedule(raw: string): { kind: string; minutes?: number; expr?: string; run_at?: string; display?: string } {
  const s = (typeof raw === "string" ? raw : "").trim();

  // Interval patterns: "every 15m", "every 2h", "30m", "1h"
  const intervalMatch = s.match(/^(?:every\s+)?(\d+)\s*(m|min|minutes?|h|hr|hours?)$/i);
  if (intervalMatch) {
    const n = parseInt(intervalMatch[1], 10);
    const unit = intervalMatch[2].toLowerCase();
    const minutes = unit.startsWith("h") ? n * 60 : n;
    return { kind: "interval", minutes, display: `every ${minutes}m` };
  }

  // Cron expression: 5 space-separated fields
  const cronParts = s.split(/\s+/);
  if (cronParts.length === 5 && cronParts.every((p) => /^[\d\*\/\-\,]+$/.test(p))) {
    return { kind: "cron", expr: s, display: s };
  }

  // ISO timestamp → one-shot
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return { kind: "once", run_at: s, display: s };
  }

  // Fallback
  return { kind: "interval", minutes: 15, display: s };
}

// ── Cron Job Types ────────────────────────────────────────────

export interface CronJobData {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  model: string;
  provider?: string;
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

// ── Session Completion Validation ──────────────────────────────

export interface SessionMessage {
  role?: string;
  content?: string;
  finish_reason?: string;
  tool_calls?: unknown[];
  [key: string]: unknown;
}

export interface SessionValidationResult {
  completed: boolean;
  reason: string;
  timedOut: boolean;
  hasFinalReport: boolean;
  lastMessageRole: string;
}

/**
 * Validate whether a cron/mission session actually completed successfully.
 *
 * A session is considered completed only if:
 * 1. The last message is from the assistant (not a tool result)
 * 2. The assistant produced a meaningful response (not just tool calls)
 *
 * A session is timed out if:
 * - The last message is a tool result (agent was killed before responding)
 * - The finish_reason is "tool_calls" on the last assistant message (was about to do more work)
 */
export function validateSessionCompletion(
  messages: SessionMessage[],
  timeoutMinutes?: number,
  sessionCreated?: string
): SessionValidationResult {
  if (messages.length === 0) {
    return { completed: false, reason: "empty session", timedOut: false, hasFinalReport: false, lastMessageRole: "none" };
  }

  const lastMsg = messages[messages.length - 1];
  const lastRole = lastMsg.role || "unknown";
  const lastContent = typeof lastMsg.content === "string" ? lastMsg.content : "";
  const lastFinishReason = lastMsg.finish_reason || "";

  // Check for timeout: session duration exceeds expected timeout
  let timedOut = false;
  if (timeoutMinutes && sessionCreated) {
    try {
      const created = new Date(sessionCreated).getTime();
      const elapsed = (Date.now() - created) / 60000; // minutes
      if (elapsed > timeoutMinutes * 1.1) { // 10% grace
        timedOut = true;
      }
    } catch {}
  }

  // Last message is a tool result — agent was interrupted before responding
  if (lastRole === "tool") {
    return {
      completed: false,
      reason: "interrupted: last message is a tool result, agent never responded",
      timedOut: true,
      hasFinalReport: false,
      lastMessageRole: lastRole,
    };
  }

  // Last assistant message has tool_calls — agent was about to do more work
  if (lastRole === "assistant" && lastFinishReason === "tool_calls" && messages.length > 1) {
    // Check if there's a response after the tool calls were made
    const toolResults = messages.slice(messages.length - 3).filter((m) => m.role === "tool");
    if (toolResults.length > 0) {
      return {
        completed: false,
        reason: "interrupted: assistant issued tool calls but was killed before processing results",
        timedOut: true,
        hasFinalReport: false,
        lastMessageRole: lastRole,
      };
    }
  }

  // Check for completion signals
  const hasGoalDone = lastContent.includes("GOAL_DONE");
  const hasSilent = lastContent.trim() === "[SILENT]";
  const hasMeaningfulContent = lastContent.trim().length > 50;

  // Last message is from assistant with meaningful content
  if (lastRole === "assistant") {
    if (hasSilent) {
      return { completed: true, reason: "completed: agent signaled [SILENT]", timedOut, hasFinalReport: false, lastMessageRole: lastRole };
    }
    if (hasGoalDone || hasMeaningfulContent) {
      return { completed: true, reason: "completed: assistant produced final response", timedOut, hasFinalReport: true, lastMessageRole: lastRole };
    }
    return {
      completed: false,
      reason: "incomplete: assistant response is too short (< 50 chars), likely truncated",
      timedOut,
      hasFinalReport: false,
      lastMessageRole: lastRole,
    };
  }

  // System or other message last
  return {
    completed: false,
    reason: `unexpected: last message role is "${lastRole}"`,
    timedOut: timedOut || lastRole !== "user",
    hasFinalReport: false,
    lastMessageRole: lastRole,
  };
}
