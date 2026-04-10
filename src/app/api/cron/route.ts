import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

import { HERMES_HOME, PATHS, getDefaultModelConfig } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
const CRON_PATH = PATHS.cronJobs;

interface CronJobData {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  skill?: string;
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
  paused_at?: string | null;
  [key: string]: unknown;
}

function readJobsFile(): { jobs: CronJobData[]; updated_at?: string } {
  if (!existsSync(CRON_PATH)) return { jobs: [] };
  try {
    const content = readFileSync(CRON_PATH, "utf-8");
    const data = JSON.parse(content);
    // Handle both { jobs: [...] } and legacy flat dict
    if (Array.isArray(data.jobs)) return data;
    if (Array.isArray(data)) return { jobs: data };
    return { jobs: [] };
  } catch (error) {
    logApiError("GET /api/cron", "reading cron jobs file", error);
    return { jobs: [] };
  }
}

function writeJobsFile(data: { jobs: CronJobData[]; updated_at?: string }) {
  const dir = CRON_PATH.substring(0, CRON_PATH.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  data.updated_at = new Date().toISOString();
  writeFileSync(CRON_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Parse a schedule string into the structure the cron scheduler expects.
 * - "every 15m" / "every 2h" → { kind: "interval", minutes: N, display }
 * - "star/15 star star star star" (cron expr) → { kind: "cron", expr, display }
 * - "2026-04-09T12:00:00Z"   → { kind: "once", run_at: "...", display }
 */
function parseSchedule(raw: string): { kind: string; minutes?: number; expr?: string; run_at?: string; display?: string } {
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

// GET /api/cron — list all cron jobs
export async function GET() {
  try {
    const data = readJobsFile();
    const jobList = data.jobs.map((job) => {
      const scheduleStr = typeof job.schedule === "object"
        ? (job.schedule.display || job.schedule.kind || "")
        : String(job.schedule || "");
      const repeatBool = typeof job.repeat === "object"
        ? (job.repeat.times !== null ? job.repeat.times !== 1 : true)
        : Boolean(job.repeat);

      return {
        id: job.id,
        name: job.name || job.id,
        schedule: scheduleStr || job.schedule_display || "",
        prompt: job.prompt || "",
        deliver: job.deliver || "",
        model: job.model || "",
        enabled: job.enabled !== false,
        lastRun: job.last_run_at || null,
        nextRun: job.next_run_at || null,
        repeat: repeatBool,
        skills: job.skills || [],
        script: job.script || "",
        state: job.state || "unknown",
      };
    });

    return NextResponse.json({
      data: { jobs: jobList, total: jobList.length },
    });
  } catch (error) {
    logApiError("GET /api/cron", "listing cron jobs", error);
    return NextResponse.json(
      { error: "Failed to read cron jobs" },
      { status: 500 }
    );
  }
}

// POST /api/cron — create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, schedule, prompt, deliver, model, repeat, skills, script } = body;

    if (!name || !schedule || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: name, schedule, prompt" },
        { status: 400 }
      );
    }

    const data = readJobsFile();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (data.jobs.some((j) => j.id === id)) {
      return NextResponse.json(
        { error: `Job "${id}" already exists` },
        { status: 409 }
      );
    }

    const defaults = getDefaultModelConfig();

    const newJob: CronJobData = {
      id,
      name,
      prompt,
      skills: skills || [],
      model: model || defaults.model,
      provider: defaults.provider,
      schedule: parseSchedule(schedule),
      schedule_display: parseSchedule(schedule).display as string || schedule,
      repeat: { times: repeat ? -1 : 1, completed: 0 },
      enabled: true,
      state: "scheduled",
      deliver: deliver || "none",
      script: script || null,
      created_at: new Date().toISOString(),
      next_run_at: null,
    };

    data.jobs.push(newJob);
    writeJobsFile(data);
    return NextResponse.json({ data: { success: true, id, job: newJob } });
  } catch (error) {
    logApiError("POST /api/cron", "creating cron job", error);
    return NextResponse.json(
      { error: "Failed to create cron job" },
      { status: 500 }
    );
  }
}

// PUT /api/cron — update or toggle a job
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing job id" },
        { status: 400 }
      );
    }

    const data = readJobsFile();
    const jobIndex = data.jobs.findIndex((j) => j.id === id);
    if (jobIndex === -1) {
      return NextResponse.json(
        { error: `Job "${id}" not found` },
        { status: 404 }
      );
    }

    const job = data.jobs[jobIndex];

    if (action === "pause") {
      job.enabled = false;
      job.paused_at = new Date().toISOString();
      job.state = "paused";
    } else if (action === "resume") {
      job.enabled = true;
      job.paused_at = null;
      job.state = "scheduled";
    } else if (action === "run") {
      // Trigger the job to run on the next scheduler tick (within ~60s).
      // Mirrors trigger_job() from cron/jobs.py — sets next_run_at to now
      // so the scheduler's get_due_jobs() picks it up immediately.
      job.next_run_at = new Date().toISOString();
      job.state = "scheduled";
      job.enabled = true;
      job.paused_at = null;
    } else {
      // Whitelist allowed fields to prevent mass assignment
      const ALLOWED_FIELDS = ["name", "prompt", "skills", "model", "deliver", "enabled", "schedule"] as const;
      for (const field of ALLOWED_FIELDS) {
        if (field in updates) {
          const value = (updates as Record<string, unknown>)[field];
          if (field === "schedule" && typeof value === "string") {
            (job as Record<string, unknown>)[field] = parseSchedule(value);
          } else {
            (job as Record<string, unknown>)[field] = value;
          }
        }
      }
    }

    data.jobs[jobIndex] = job;
    writeJobsFile(data);
    return NextResponse.json({ data: { success: true, id, job } });
  } catch (error) {
    logApiError("PUT /api/cron", "updating cron job", error);
    return NextResponse.json(
      { error: "Failed to update cron job" },
      { status: 500 }
    );
  }
}

// DELETE /api/cron — delete a job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing job id" },
        { status: 400 }
      );
    }

    const data = readJobsFile();
    const jobIndex = data.jobs.findIndex((j) => j.id === id);
    if (jobIndex === -1) {
      return NextResponse.json(
        { error: `Job "${id}" not found` },
        { status: 404 }
      );
    }

    data.jobs.splice(jobIndex, 1);
    writeJobsFile(data);
    return NextResponse.json({ data: { success: true, deleted: id } });
  } catch (error) {
    logApiError("DELETE /api/cron", "deleting cron job", error);
    return NextResponse.json(
      { error: "Failed to delete cron job" },
      { status: 500 }
    );
  }
}
