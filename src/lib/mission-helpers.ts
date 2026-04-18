// ═══════════════════════════════════════════════════════════════
// Control Hub - Pure helper functions (no Next.js imports)
// Extracted from missions/route.ts for testability.
// ═══════════════════════════════════════════════════════════════

import { TEMPLATES_OSS } from "@/lib/mission-templates-oss";
import type { CronJobData } from "@/lib/utils";

// ── Template definition (prompt-building blocks) ───────────────

export interface TemplateDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  profile: string;
  description: string;
  instruction: string;
  context: string;
  goals: string[];
  suggestedSkills: string[];
}

// ── Scope Labels ──────────────────────────────────────────────

export function getScopeLabel(minutes: number): string {
  if (minutes <= 10) return "Quick Pass";
  if (minutes <= 15) return "Half Day";
  if (minutes <= 20) return "Most of a Day";
  if (minutes <= 30) return "Full Day";
  if (minutes <= 45) return "Deep Dive";
  return "Sprint";
}

// ── Time Conversion ───────────────────────────────────────────

export function missionTimeToDevHours(agentMinutes: number): number {
  return Math.round(agentMinutes * 16 / 60);
}

// ── Goals Section ─────────────────────────────────────────────

export function buildGoalsSection(goals: string[]): string {
  return (
    `## Goals (complete each in order)\n` +
    goals.map((g, i) => `${i + 1}. [ ] ${g}`).join("\n") +
    `\n\nMark each goal as done by including "GOAL_DONE: <goal text>" in your response when you finish each one.`
  );
}

// ── Full Mission Prompt Builder ───────────────────────────────

export function buildMissionPrompt(mission: {
  prompt: string;
  goals: string[];
  missionTimeMinutes: number;
  timeoutMinutes: number;
}): string {
  const devHours = missionTimeToDevHours(mission.missionTimeMinutes);
  const scopeLabel = getScopeLabel(mission.missionTimeMinutes);

  const scopeSection =
    `## MISSION SCOPE\n` +
    `Planning horizon: ${scopeLabel} (${mission.missionTimeMinutes} min agent time ≈ ${devHours} developer hours).\n` +
    `This is a SOFT GUIDE for how much work to plan, not a hard deadline.\n` +
    `Plan your approach to fill this time with meaningful, impactful work.\n` +
    `Do NOT rush - quality over speed. Do NOT pad - stop when the work is done.\n\n`;

  const safetySection =
    `## SAFETY LIMITS\n` +
    `- Inactivity timeout: ${mission.timeoutMinutes} minutes. If you stop making API calls or tool\n` +
    `  requests for this duration, your session will be terminated.\n` +
    `- To avoid timeout: stay active. Each tool call, file read, or API request resets the timer.\n` +
    `- You can work for as long as needed - just stay active.\n\n`;

  let prompt = "";
  if (mission.goals.length > 0) {
    prompt += buildGoalsSection(mission.goals) + "\n\n---\n\n";
  }
  prompt += scopeSection + safetySection + mission.prompt;
  return prompt;
}

// ── Mission Status Mapper ─────────────────────────────────────
// Maps cron job state directly to mission status.
// Source of truth: cron job file. No session reading, no heuristics.
export function getMissionStatus(
  job: CronJobData | null,
  currentStatus: string,
): { status: string; error?: string } {
  if (!job) {
    // Cron job deleted - for one-shot dispatches this means it completed
    if (currentStatus === "dispatched") return { status: "successful" };
    return { status: currentStatus };
  }
  // User cancelled the job
  if (job.state === "paused" && !job.enabled) {
    return { status: "failed", error: "Cancelled by user" };
  }
  // Scheduler is actively executing - highest priority
  if (job.state === "running") {
    return { status: "dispatched" };
  }
  // Job has never run
  if (!job.last_run_at) {
    return { status: "queued" };
  }
  // Job has run - check result
  if (job.last_status === "ok") {
    return { status: "successful" };
  }
  if (job.last_status === "error") {
    return { status: "failed" };
  }
  // Job ran but no status yet (still executing or status not recorded)
  return { status: "dispatched" };
}

// ── Template Definitions ──────────────────────────────────────

/** Flatten template instruction + context into a single mission prompt. */
export function promptFromTemplate(t: TemplateDef): string {
  const ctx = t.context && t.context.trim() ? "\n\n## Additional Context\n\n" + t.context : "";
  return t.instruction + ctx;
}

export const TEMPLATES: TemplateDef[] = TEMPLATES_OSS;
