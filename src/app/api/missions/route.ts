import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════

// Missions API — CRUD + Real Dispatch via Cron Jobs

// ═══════════════════════════════════════════════════════════════



import { PATHS, getDefaultModelConfig } from "@/lib/hermes";

import { existsSync, readFileSync, readdirSync, unlinkSync, statSync } from "fs";

import { logApiError } from "@/lib/api-logger";

import { parseSchedule, CronJobData } from "@/lib/utils";

import { readJobsFile, withJobsFileLock } from "@/lib/jobs-repository";

import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";

import { appendAuditLine } from "@/lib/audit-log";

import {

  buildMissionPrompt,

  getMissionStatus,

  TEMPLATES,

} from "@/lib/mission-helpers";

import {

  ensureMissionsDir,

  getMissionsDataDir,

  loadMission,

  saveMission,

  sanitizeMissionId,

} from "@/lib/missions-repository";

import { missionPostBodySchema, zodErrorResponse } from "@/lib/api-schemas";

import type { Mission } from "@/types/hermes";



const CRON_PATH = PATHS.cronJobs;

const JOBS_BACKUP_DIR = PATHS.backups + "/ch-cron-jobs";



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



// ── Cron helpers ──────────────────────────────────────────────



function findCronJobForMission(missionId: string): CronJobData | null {

  const parsed = readJobsFile(CRON_PATH);

  if (!parsed.ok) return null;

  return parsed.jobs.find((j) => j.mission_id === missionId) || null;

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

    const missionId = url.searchParams.get("id")

      ? sanitizeMissionId(url.searchParams.get("id")!)

      : null;



    if (action === "templates") {

      // Merge built-in templates with custom templates

      const builtIn = TEMPLATES.map((t) => ({ ...t, isCustom: false }));

      const custom: Array<Record<string, unknown>> = [];



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

        mission.status = mapped.status as Mission["status"];

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

    ensureMissionsDir();

    const missionsDir = getMissionsDataDir();

    const files = existsSync(missionsDir)

      ? readdirSync(missionsDir).filter((f) => f.endsWith(".json"))

      : [];

    const missions: Array<

      Mission & {

        cronJob?: {

          state: string;

          enabled: boolean;

          lastRun: string | null;

          lastStatus: string | null;

        };

        latestSession?: { id: string; modified: string } | null;

      }

    > = [];



    // PERFORMANCE: Read cron jobs once, build lookup map instead of re-reading per mission

    const cronParsed = readJobsFile(CRON_PATH);

    const allCronJobs = cronParsed.ok

      ? cronParsed.jobs

      : (() => {

          logApiError(

            "GET /api/missions",

            "cron jobs file unreadable: " + cronParsed.error,

            new Error(cronParsed.error)

          );

          return [];

        })();

    const cronJobMap = new Map(

      allCronJobs

        .filter((j) => j.mission_id != null && j.mission_id !== "")

        .map((j) => [j.mission_id as string, j])

    );



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

        const content = readFileSync(missionsDir + "/" + file, "utf-8");

        const m = JSON.parse(content) as Mission;



        // Derive status from cron job

        if (m.cronJobId) {

          const job = cronJobMap.get(m.id) || null;

          const mapped = getMissionStatus(job, m.status);

          m.status = mapped.status as Mission["status"];

          if (mapped.error) m.error = mapped.error;

          m.updatedAt = new Date().toISOString();



          if (job) {

            (m as Mission & { cronJob: unknown }).cronJob = {

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



    return NextResponse.json(
      { data: { missions, total: missions.length, active: missions.filter((m) => m.status === "queued" || m.status === "dispatched").length, completed: missions.filter((m) => m.status === "successful").length } },
      { headers: { "Cache-Control": "public, max-age=3, stale-while-revalidate=5" } }
    );

  } catch (err) {

    logApiError("GET /api/missions", "listing missions", err);

    return NextResponse.json({ error: "Failed to list missions" }, { status: 500 });

  }

}



// ── POST ──────────────────────────────────────────────────────



export async function POST(request: NextRequest) {

  const ro = requireNotReadOnly();

  if (ro) return ro;

  const auth = requireMcApiKey(request);

  if (auth) return auth;



  try {

    let raw: unknown;

    try {

      raw = await request.json();

    } catch {

      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    }

    const parsedBody = missionPostBodySchema.safeParse(raw);

    if (!parsedBody.success) {

      return zodErrorResponse(parsedBody.error);

    }

    const payload = parsedBody.data;



    if (payload.action === "create") {

      const id = "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      const now = new Date().toISOString();

      const dispatchMode: "save" | "now" | "cron" = payload.dispatchMode ?? "save";



      const record: Mission = {

        id,

        name: payload.name || "Untitled Mission",

        prompt: payload.prompt || "",

        goals: payload.goals || [],

        skills: payload.skills || [],

        model: payload.model || "",

        profile: payload.profile || "",

        missionTimeMinutes: Math.max(5, Math.min(120, payload.missionTimeMinutes ?? 15)),

        timeoutMinutes: Math.max(1, Math.min(120, payload.timeoutMinutes ?? 10)),

        schedule: payload.schedule || "every 5m",

        status: "queued",

        dispatchMode,

        createdAt: now,

        updatedAt: now,

        results: null,

        duration: null,

        error: null,

        templateId: payload.templateId ?? null,

      };



      // If dispatch mode is "now" or "cron", create a real cron job

      if (dispatchMode !== "save") {

        const cronId = "mission-" + id;



        // Build enhanced prompt with Mission Scope + Safety Limits

        const missionPrompt = buildMissionPrompt(record);



        let parsedSchedule: CronJobData["schedule"];

        let scheduleDisplay: string;

        if (dispatchMode === "cron") {

          const sched = parseSchedule(record.schedule);

          if (sched.kind === "invalid") {

            return NextResponse.json({ error: sched.message }, { status: 400 });

          }

          parsedSchedule = sched;

          scheduleDisplay = sched.display;

        } else {

          parsedSchedule = { kind: "once", run_at: now, display: "once (immediate)" };

          scheduleDisplay = "once (immediate)";

        }



        const defaults = getDefaultModelConfig();

        const baseUrl = (payload.base_url ?? defaults.base_url).trim();



        const cronJob = {

          id: cronId,

          name: "Mission: " + record.name,

          prompt: missionPrompt,

          skills: record.skills,

          model: record.model || defaults.model,

          provider: defaults.provider,

          ...(baseUrl ? { base_url: baseUrl } : {}),

          schedule: parsedSchedule,

          schedule_display: scheduleDisplay,

          repeat: dispatchMode === "now"

            ? { times: 1, completed: 0 }

            : { times: null, completed: 0 },

          enabled: true,

          state: "scheduled",

          deliver: getDeliverTarget(),

          created_at: now,

          next_run_at: now,

          mission_id: id,

          timeout: record.timeoutMinutes * 60,

          profile: record.profile || undefined,

        } as CronJobData;



        const w = await withJobsFileLock(

          CRON_PATH,

          JOBS_BACKUP_DIR,

          (jobs) => ({

            action: "write" as const,

            jobs: [...jobs, cronJob],

            value: undefined,

          })

        );

        if (!w.ok) {

          return NextResponse.json(

            { error: w.error },

            { status: 503 }

          );

        }



        record.cronJobId = cronId;

        record.status = "dispatched";

      }



      saveMission(record);

      appendAuditLine({

        action: "mission.create",

        resource: record.id,

        ok: true,

      });

      return NextResponse.json({ data: record });

    }



    if (payload.action === "delete") {

      const { missionId } = payload;

      const mission = loadMission(missionId);



      if (mission?.cronJobId) {

        const w = await withJobsFileLock(

          CRON_PATH,

          JOBS_BACKUP_DIR,

          (jobs) => {

            const idx = jobs.findIndex((j) => j.id === mission.cronJobId);

            if (idx === -1) {

              return {

                action: "write" as const,

                jobs,

                value: undefined,

              };

            }

            const next = jobs.filter((j) => j.id !== mission.cronJobId);

            return { action: "write" as const, jobs: next, value: undefined };

          }

        );

        if (!w.ok) {

          return NextResponse.json({ error: w.error }, { status: 503 });

        }

      }



      const safe = sanitizeMissionId(missionId);

      const path = getMissionsDataDir() + "/" + safe + ".json";

      if (existsSync(path)) {

        unlinkSync(path);

        appendAuditLine({

          action: "mission.delete",

          resource: String(missionId),

          ok: true,

        });

        return NextResponse.json({ data: { deleted: true } });

      }

      return NextResponse.json({ error: "Mission not found" }, { status: 404 });

    }



    if (payload.action === "cancel") {

      const { missionId } = payload;

      const mission = loadMission(missionId);

      if (!mission) {

        return NextResponse.json({ error: "Mission not found" }, { status: 404 });

      }



      if (mission.cronJobId) {

        const w = await withJobsFileLock(

          CRON_PATH,

          JOBS_BACKUP_DIR,

          (jobs) => {

            const next = jobs.map((j) => ({ ...j }));

            const idx = next.findIndex((j) => j.id === mission.cronJobId);

            if (idx === -1) {

              return { action: "write" as const, jobs: next, value: undefined };

            }

            next[idx].enabled = false;

            next[idx].state = "paused";

            return { action: "write" as const, jobs: next, value: undefined };

          }

        );

        if (!w.ok) {

          return NextResponse.json({ error: w.error }, { status: 503 });

        }

      }



      mission.status = "failed";

      mission.error = "Cancelled by user";

      mission.updatedAt = new Date().toISOString();

      saveMission(mission);

      appendAuditLine({

        action: "mission.cancel",

        resource: missionId,

        ok: true,

      });

      return NextResponse.json({ data: mission });

    }



    if (payload.action === "update") {

      const { missionId } = payload;

      const mission = loadMission(missionId);

      if (!mission) {

        return NextResponse.json({ error: "Mission not found" }, { status: 404 });

      }



      // Update mission fields

      if (payload.name !== undefined) mission.name = payload.name;

      if (payload.prompt !== undefined) mission.prompt = payload.prompt;

      if (payload.goals !== undefined) mission.goals = payload.goals;

      if (payload.skills !== undefined) mission.skills = payload.skills;

      if (payload.profile !== undefined) mission.profile = payload.profile;

      if (payload.missionTimeMinutes !== undefined) {

        mission.missionTimeMinutes = Math.max(5, Math.min(120, payload.missionTimeMinutes));

      }

      if (payload.timeoutMinutes !== undefined) {

        mission.timeoutMinutes = Math.max(1, Math.min(120, payload.timeoutMinutes));

      }

      if (payload.schedule !== undefined) {

        if (mission.dispatchMode === "cron") {

          const pr = parseSchedule(payload.schedule);

          if (pr.kind === "invalid") {

            return NextResponse.json({ error: pr.message }, { status: 400 });

          }

        }

        mission.schedule = payload.schedule;

      }

      mission.updatedAt = new Date().toISOString();

      saveMission(mission);



      if (mission.cronJobId) {

        const w = await withJobsFileLock(

          CRON_PATH,

          JOBS_BACKUP_DIR,

          (jobs) => {

            const next = jobs.map((j) => ({ ...j }));

            const idx = next.findIndex((j) => j.id === mission.cronJobId);

            if (idx === -1) {

              return { action: "write" as const, jobs: next, value: undefined };

            }

            const job = { ...next[idx] } as CronJobData;

            if (

              payload.prompt !== undefined ||

              payload.goals !== undefined ||

              payload.missionTimeMinutes !== undefined ||

              payload.timeoutMinutes !== undefined

            ) {

              job.prompt = buildMissionPrompt(mission);

              job.timeout = mission.timeoutMinutes * 60;

            }

            if (payload.name !== undefined) {

              job.name = "Mission: " + mission.name;

            }

            if (payload.schedule !== undefined && mission.dispatchMode === "cron") {

              const scheduleResult = parseSchedule(mission.schedule);

              if (scheduleResult.kind !== "invalid") {

                job.schedule = scheduleResult;

                job.schedule_display = scheduleResult.display;

              }

            }

            if (payload.skills !== undefined) {

              job.skills = mission.skills;

            }

            if (payload.profile !== undefined) {

              job.profile = mission.profile || undefined;

            }

            next[idx] = job;

            return { action: "write" as const, jobs: next, value: undefined };

          }

        );

        if (!w.ok) {

          return NextResponse.json({ error: w.error }, { status: 503 });

        }

      }



      appendAuditLine({

        action: "mission.update",

        resource: missionId,

        ok: true,

      });

      return NextResponse.json({ data: mission });

    }



    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (err) {

    logApiError("POST /api/missions", "processing request", err);

    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });

  }

}

