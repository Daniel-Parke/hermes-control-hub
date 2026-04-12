import { NextResponse } from "next/server";
// ═══════════════════════════════════════════════════════════════
// Missions API — CRUD + Real Dispatch via Cron Jobs
// ═══════════════════════════════════════════════════════════════

import { HERMES_HOME, PATHS, getDefaultModelConfig } from "@/lib/hermes";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from "fs";
import { logApiError } from "@/lib/api-logger";
import { parseSchedule, CronJobData } from "@/lib/utils";
import {
  getScopeLabel,
  missionTimeToDevHours,
  buildGoalsSection,
  buildMissionPrompt,
  getMissionStatus,
  TEMPLATES,
  TemplateDef,
} from "@/lib/mission-helpers";

const DATA_DIR = PATHS.missions;
const CRON_PATH = PATHS.cronJobs;

// Resolve delivery target from .env or config
function getDeliverTarget(): string {
  try {
    if (existsSync(PATHS.env)) {
      const env = readFileSync(PATHS.env, "utf-8");
      const match = env.match(/^DISCORD_HOME_CHANNEL=(.+)$/m);
      if (match) {
        const channel = match[1].trim().replace(/^['"]|['"]$/g, "");
        if (channel) return "discord:" + channel;
      }
    }
  } catch {}
  return "local";
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sanitizeId(id: string): string {
  // Only allow alphanumeric, hyphens, underscores — block path traversal
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function loadMission(id: string): MissionRecord | null {
  const safe = sanitizeId(id);
  if (!safe) return null;
  const path = DATA_DIR + "/" + safe + ".json";
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function saveMission(record: MissionRecord) {
  ensureDir();
  const safe = sanitizeId(record.id);
  if (!safe) return;
  const path = DATA_DIR + "/" + safe + ".json";
  writeFileSync(path, JSON.stringify(record, null, 2));
}

interface MissionRecord {
  id: string;
  name: string;
  prompt: string;
  goals: string[];
  skills: string[];
  model: string;
  profile: string;
  missionTimeMinutes: number;
  timeoutMinutes: number;
  schedule: string;
  status: "queued" | "dispatched" | "successful" | "failed";
  dispatchMode: "save" | "now" | "cron";
  createdAt: string;
  updatedAt: string;
  results: string | null;
  duration: number | null;
  error: string | null;
  cronJobId?: string;
  templateId?: string;
}

// ── Cron helpers ──────────────────────────────────────────────

function readCronJobs(): CronJobData[] {
  if (!existsSync(CRON_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(CRON_PATH, "utf-8"));
    return Array.isArray(data.jobs) ? data.jobs : [];
  } catch (err) {
    logApiError("missions/findSessionsForCronJob", "scanning session files", err);
    return [];
  }
}

function writeCronJobs(jobs: CronJobData[]) {
  const dir = CRON_PATH.substring(0, CRON_PATH.lastIndexOf("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CRON_PATH, JSON.stringify({ jobs, updated_at: new Date().toISOString() }, null, 2));
}

function findCronJobForMission(missionId: string): CronJobData | null {
  const jobs = readCronJobs();
  return jobs.find((j) => j.mission_id === missionId) || null;
}

// ── Find sessions that ran a specific cron job ────────────────
// PERFORMANCE: Match by filename pattern (session_cron_<jobId>_*.json)
// instead of reading every file's content. O(directory listing) vs O(N file reads).

function findSessionsForCronJob(cronJobId: string): Array<{ id: string; modified: string; size: number }> {
  const sessionsDir = PATHS.sessions;
  if (!existsSync(sessionsDir)) return [];
  try {
    const files = readdirSync(sessionsDir);
    const results: Array<{ id: string; modified: string; size: number }> = [];
    for (const file of files) {
      if (!file.endsWith(".json") && !file.endsWith(".jsonl")) continue;
      if (!file.includes(cronJobId)) continue;
      const filePath = sessionsDir + "/" + file;
      try {
        const stat = statSync(filePath);
        results.push({
          id: file.replace(/\.(json|jsonl)$/, ""),
          modified: stat.mtime.toISOString(),
          size: stat.size,
        });
      } catch {}
    }
    return results.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()).slice(0, 5);
  } catch {
    return [];
  }
}

// ── Mission Templates ─────────────────────────────────────────
// (template definitions and helper functions live in @/lib/mission-helpers)

// ── Template definitions (28 built-in templates across 8 categories) ──
// Defined in @/lib/mission-helpers and imported above.
// (TEMPLATES array removed — now sourced from mission-helpers.ts)


// ── GET ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const missionId = url.searchParams.get("id") ? sanitizeId(url.searchParams.get("id")!) : null;

    if (action === "templates") {
      // Merge built-in templates with custom templates
      const builtIn = TEMPLATES.map((t) => ({ ...t, isCustom: false }));
      let custom: Array<Record<string, unknown>> = [];

      const customDir = PATHS.templates;
      if (existsSync(customDir)) {
        try {
          const files = readdirSync(customDir).filter((f) => f.endsWith(".json"));
          for (const file of files) {
            try {
              const tmpl = JSON.parse(readFileSync(customDir + "/" + file, "utf-8"));
              // Provide defaults for legacy templates missing new fields
              custom.push({
                ...tmpl,
                category: tmpl.category || "Custom",
                profile: tmpl.profile || "",
                isCustom: true,
              });
            } catch {}
          }
        } catch {}
      }

      return NextResponse.json({ data: { templates: [...builtIn, ...custom] } });
    }

    // ── Status Mapper ─────────────────────────────────────────────
    // Maps cron job state directly to mission status.
    // Source of truth: cron job file. No session reading, no heuristics.
    // Get single mission with linked cron job + sessions
    if (missionId) {
      const mission = loadMission(missionId);
      if (!mission) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }

      let cronJob = null;
      let sessions: Array<{ id: string; modified: string; size: number }> = [];

      if (mission.cronJobId) {
        const job = findCronJobForMission(missionId);
        const mapped = getMissionStatus(job, mission.status);
        mission.status = mapped.status as MissionRecord["status"];
        if (mapped.error) mission.error = mapped.error;
        mission.updatedAt = new Date().toISOString();

        if (job) {
          cronJob = {
            id: job.id,
            name: job.name,
            state: job.state || "unknown",
            enabled: job.enabled !== false,
            lastRun: job.last_run_at || null,
            nextRun: job.next_run_at || null,
            lastStatus: job.last_status || null,
            schedule: typeof job.schedule === "object" ? job.schedule.display || "" : String(job.schedule || ""),
          };
          sessions = findSessionsForCronJob(job.id);
        }
      }

      return NextResponse.json({ data: { mission, cronJob, sessions } });
    }

    // List all missions with linked cron status
    ensureDir();
    const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")) : [];
    const missions: Array<MissionRecord & { cronJob?: { state: string; enabled: boolean; lastRun: string | null; lastStatus: string | null }; latestSession?: { id: string; modified: string } | null }> = [];

    // PERFORMANCE: Read cron jobs once, build lookup map instead of re-reading per mission
    const allCronJobs = readCronJobs();
    const cronJobMap = new Map(allCronJobs.map((j) => [j.mission_id, j]));

    // PERFORMANCE: Scan sessions directory once, build map of missionId -> latest session
    const sessionsMap = new Map<string, { id: string }>();
    try {
      const sessionsDir = PATHS.sessions;
      if (existsSync(sessionsDir)) {
        const sessionFiles = readdirSync(sessionsDir);
        for (const sf of sessionFiles) {
          if (!sf.endsWith(".json") && !sf.endsWith(".jsonl")) continue;
          // Session filename: session_cron_<cronJobId>_<YYYYMMDD_HHMMSS>.json
          // cronJobId for missions is "mission-<missionId>"
          // Extract missionId directly from filename
          const match = sf.match(/session_cron_mission-(m_[a-z0-9]+)_\d{8}_\d{6}\./);
          if (match) {
            const missionId = match[1];
            const sessionId = sf.replace(/\.(json|jsonl)$/, "");
            const existing = sessionsMap.get(missionId);
            // Keep the most recent session (filenames are lexicographically timestamped)
            if (!existing || sessionId > existing.id) {
              sessionsMap.set(missionId, { id: sessionId });
            }
          }
        }
      }
    } catch {}

    for (const file of files) {
      try {
        const content = readFileSync(DATA_DIR + "/" + file, "utf-8");
        const m: MissionRecord = JSON.parse(content);

        // Derive status from cron job
        if (m.cronJobId) {
          const job = cronJobMap.get(m.id) || null;
          const mapped = getMissionStatus(job, m.status);
          m.status = mapped.status as MissionRecord["status"];
          if (mapped.error) m.error = mapped.error;
          m.updatedAt = new Date().toISOString();

          if (job) {
            (m as MissionRecord & { cronJob: unknown }).cronJob = {
              state: job.state || "unknown",
              enabled: job.enabled !== false,
              lastRun: job.last_run_at || null,
              lastStatus: job.last_status || null,
            };
          }
        }

        // Attach latest session if available
        const latestSession = sessionsMap.get(m.id) || null;

        missions.push({ ...m, latestSession } as typeof missions[0]);
      } catch {}
    }

    missions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      data: {
        missions,
        total: missions.length,
        active: missions.filter((m) => m.status === "queued" || m.status === "dispatched").length,
        completed: missions.filter((m) => m.status === "successful").length,
      },
    });
  } catch (err) {
    logApiError("GET /api/missions", "listing missions", err);
    return NextResponse.json({ error: "Failed to list missions" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const id = "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const now = new Date().toISOString();
      const dispatchMode: "save" | "now" | "cron" = body.dispatchMode || "save";

      const record: MissionRecord = {
        id,
        name: body.name || "Untitled Mission",
        prompt: body.prompt || "",
        goals: body.goals || [],
        skills: body.skills || [],
        model: body.model || "",
        profile: body.profile || "",
        missionTimeMinutes: Math.max(5, Math.min(120, body.missionTimeMinutes || 15)),
        timeoutMinutes: Math.max(1, Math.min(120, body.timeoutMinutes || 10)),
        schedule: body.schedule || "every 5m",
        status: "queued",
        dispatchMode,
        createdAt: now,
        updatedAt: now,
        results: null,
        duration: null,
        error: null,
        templateId: body.templateId || undefined,
      };

      // Parse schedule string into cron schedule object using shared parser
      function parseMissionSchedule(scheduleStr: string): { schedule: CronJobData["schedule"]; schedule_display: string } {
        const result = parseSchedule(scheduleStr);
        return { schedule: result, schedule_display: result.display || scheduleStr };
      }

      // If dispatch mode is "now" or "cron", create a real cron job
      if (dispatchMode !== "save") {
        const cronId = "mission-" + id;

        // Build enhanced prompt with Mission Scope + Safety Limits
        const missionPrompt = buildMissionPrompt(record);

        const parsed = dispatchMode === "cron"
          ? parseMissionSchedule(record.schedule)
          : { schedule: { kind: "once", run_at: now, display: "once (immediate)" }, schedule_display: "once (immediate)" };

        const defaults = getDefaultModelConfig();

        const cronJob = {
          id: cronId,
          name: "Mission: " + record.name,
          prompt: missionPrompt,
          skills: record.skills,
          model: record.model || defaults.model,
          provider: defaults.provider,
          schedule: parsed.schedule,
          schedule_display: parsed.schedule_display,
          repeat: dispatchMode === "now"
            ? { times: 1, completed: 0 }
            : { times: -1, completed: 0 },
          enabled: true,
          state: "scheduled",
          deliver: getDeliverTarget(),
          created_at: now,
          next_run_at: now,
          mission_id: id,
          timeout: record.timeoutMinutes * 60,
          profile: record.profile || undefined,
        } as CronJobData;

        // Write cron job to jobs.json
        const jobs = readCronJobs();
        jobs.push(cronJob);
        writeCronJobs(jobs);

        record.cronJobId = cronId;
        record.status = "dispatched";
      }

      saveMission(record);
      return NextResponse.json({ data: record });
    }

    if (action === "delete") {
      const { missionId } = body;
      const mission = loadMission(missionId);

      // Also clean up associated cron job
      if (mission?.cronJobId) {
        const jobs = readCronJobs();
        const idx = jobs.findIndex((j) => j.id === mission.cronJobId);
        if (idx !== -1) {
          jobs.splice(idx, 1);
          writeCronJobs(jobs);
        }
      }

      const safe = sanitizeId(missionId);
      const path = DATA_DIR + "/" + safe + ".json";
      if (existsSync(path)) {
        unlinkSync(path);
        return NextResponse.json({ data: { deleted: true } });
      }
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    if (action === "cancel") {
      const { missionId } = body;
      const mission = loadMission(missionId);
      if (!mission) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }

      // Disable the cron job
      if (mission.cronJobId) {
        const jobs = readCronJobs();
        const idx = jobs.findIndex((j) => j.id === mission.cronJobId);
        if (idx !== -1) {
          jobs[idx].enabled = false;
          jobs[idx].state = "paused";
          writeCronJobs(jobs);
        }
      }

      mission.status = "failed";
      mission.error = "Cancelled by user";
      mission.updatedAt = new Date().toISOString();
      saveMission(mission);
      return NextResponse.json({ data: mission });
    }

    if (action === "update") {
      const { missionId } = body;
      const mission = loadMission(missionId);
      if (!mission) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }

      // Update mission fields
      if (body.name !== undefined) mission.name = body.name;
      if (body.prompt !== undefined) mission.prompt = body.prompt;
      if (body.goals !== undefined) mission.goals = body.goals;
      if (body.profile !== undefined) mission.profile = body.profile;
      if (body.missionTimeMinutes !== undefined) mission.missionTimeMinutes = Math.max(5, Math.min(120, body.missionTimeMinutes));
      if (body.timeoutMinutes !== undefined) mission.timeoutMinutes = Math.max(1, Math.min(120, body.timeoutMinutes));
      if (body.schedule !== undefined) mission.schedule = body.schedule;
      mission.updatedAt = new Date().toISOString();
      saveMission(mission);

      // Sync to cron job if linked and recurring
      if (mission.cronJobId) {
        const jobs = readCronJobs();
        const idx = jobs.findIndex((j) => j.id === mission.cronJobId);
        if (idx !== -1) {
          if (body.prompt !== undefined || body.goals !== undefined || body.missionTimeMinutes !== undefined || body.timeoutMinutes !== undefined) {
            const missionPrompt = buildMissionPrompt(mission);
            jobs[idx].prompt = missionPrompt;
            jobs[idx].timeout = mission.timeoutMinutes * 60;
          }
          if (body.name !== undefined) {
            jobs[idx].name = "Mission: " + mission.name;
          }
          if (body.schedule !== undefined && mission.dispatchMode === "cron") {
            const scheduleResult = parseSchedule(mission.schedule);
            jobs[idx].schedule = scheduleResult;
            jobs[idx].schedule_display = scheduleResult.display || mission.schedule;
          }
          writeCronJobs(jobs);
        }
      }

      return NextResponse.json({ data: mission });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    logApiError("POST /api/missions", "processing request", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
