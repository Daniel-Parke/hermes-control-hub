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
