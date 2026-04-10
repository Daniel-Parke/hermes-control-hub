import { NextResponse } from "next/server";
// ═══════════════════════════════════════════════════════════════
// Missions API — CRUD + Real Dispatch via Cron Jobs
// ═══════════════════════════════════════════════════════════════

import { HERMES_HOME, PATHS, getDefaultModelConfig } from "@/lib/hermes";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from "fs";
import { validateSessionCompletion, SessionMessage } from "@/lib/utils";
import { logApiError } from "@/lib/api-logger";

const DATA_DIR = PATHS.missions;
const CRON_PATH = PATHS.cronJobs;
const SESSIONS_DIR = PATHS.sessions;

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

function loadMission(id: string): MissionRecord | null {
  const path = DATA_DIR + "/" + id + ".json";
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function saveMission(record: MissionRecord) {
  ensureDir();
  const path = DATA_DIR + "/" + record.id + ".json";
  writeFileSync(path, JSON.stringify(record, null, 2));
}

interface MissionRecord {
  id: string;
  name: string;
  prompt: string;
  goals: string[];
  skills: string[];
  model: string;
  status: "draft" | "dispatched" | "running" | "completed" | "failed";
  dispatchMode: "save" | "now" | "cron";
  createdAt: string;
  updatedAt: string;
  results: string | null;
  duration: number | null;
  error: string | null;
  cronJobId?: string;
  templateId?: string;
}

interface CronJobData {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  model: string;
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
  if (!existsSync(SESSIONS_DIR)) return [];
  try {
    const files = readdirSync(SESSIONS_DIR);
    const results: Array<{ id: string; modified: string; size: number }> = [];
    for (const file of files) {
      if (!file.endsWith(".json") && !file.endsWith(".jsonl")) continue;
      // Match by filename pattern — cron sessions contain the job ID in the filename
      if (!file.includes(cronJobId)) continue;
      const filePath = SESSIONS_DIR + "/" + file;
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

const TEMPLATES = [
  {
    id: "build-feature",
    name: "Build Feature",
    icon: "Wrench",
    color: "green",
    description: "Plan and implement a new feature",
    instruction: [
      "You are a full-stack developer. Plan and build the requested feature end-to-end.",
      "",
      "Steps:",
      "1. Understand requirements — clarify the feature scope, inputs/outputs, edge cases",
      "2. Design the approach — decide on architecture, data flow, component structure",
      "3. Build incrementally — start with the core functionality, get it working before polishing",
      "4. Add tests — write unit/integration tests for critical paths",
      "5. Polish — handle edge cases, error states, loading states, responsive design",
      "6. Verify — run the build, check for TypeScript errors, test manually",
      "",
      "Follow existing code patterns and conventions. Prefer small, composable changes over large rewrites.",
    ].join("\n"),
    context: "Feature description and requirements:\n",
    goals: ["Design approach", "Build core functionality", "Add tests", "Polish & verify"],
    suggestedSkills: ["test-driven-development"],
    defaultModel: "",
    timeoutMinutes: 30,
  },
  {
    id: "content",
    name: "Content Creation",
    icon: "PenTool",
    color: "orange",
    description: "Write documentation, posts, or other content",
    instruction: [
      "You are a technical writer. Create clear, well-structured content for the intended audience.",
      "",
      "Steps:",
      "1. Research — gather information on the topic, understand the target audience",
      "2. Outline — create a logical structure with clear sections and headings",
      "3. Draft — write the content with clear language, concrete examples, and appropriate detail",
      "4. Review — check for accuracy, clarity, tone consistency, and completeness",
      "5. Format — use appropriate markdown structure (headings, lists, code blocks, tables)",
      "",
      "Write in a professional but approachable tone. Avoid jargon unless the audience expects it.",
      "Include examples wherever possible — abstract explanations are harder to follow than concrete ones.",
    ].join("\n"),
    context: "Content brief (topic, audience, format, length):\n",
    goals: ["Research & outline", "Draft content", "Review & refine", "Final polish"],
    suggestedSkills: [],
    defaultModel: "",
    timeoutMinutes: 10,
  },
  {
    id: "research",
    name: "Research & Analyse",
    icon: "Search",
    color: "cyan",
    description: "Deep research on a topic with structured findings",
    instruction: [
      "You are a research analyst. Your job is to investigate a topic thoroughly and produce a structured, evidence-based report.",
      "",
      "Steps:",
      "1. Define the research scope — identify key questions to answer",
      "2. Search the web for current, authoritative sources on the topic",
      "3. Cross-reference findings across multiple sources for accuracy",
      "4. Organise into sections: Executive Summary, Key Findings, Supporting Evidence, Risks/Caveats, Recommendations",
      "5. Cite all sources with URLs. Flag any conflicting information.",
      "6. End with a concise TL;DR (3–5 bullet points) of the most important takeaways",
    ].join("\n"),
    context: "Topic to research:\n",
    goals: ["Define scope & questions", "Gather & verify sources", "Synthesise findings", "Write report with citations"],
    suggestedSkills: [],
    defaultModel: "",
    timeoutMinutes: 10,
  },
  {
    id: "code-review",
    name: "Code Review",
    icon: "GitPullRequest",
    color: "purple",
    description: "Review code for bugs, security issues, and improvements",
    instruction: [
      "You are a senior code reviewer. Examine the codebase systematically and provide actionable feedback.",
      "",
      "CRITICAL: You have 15 minutes maximum. Focus on HIGH-IMPACT issues only.",
      "Do NOT delegate to subagents — work directly. Read files yourself.",
      "",
      "Steps:",
      "1. Map the project structure (2 min max) — entry points, key config, main modules",
      "2. Scan for critical bugs (5 min) — logic errors, null refs, race conditions, unhandled errors",
      "3. Security audit (5 min) — injection risks, exposed secrets, unsafe inputs, auth gaps",
      "4. Report findings — file path, line number, severity, description, suggested fix",
      "",
      "Prioritise: Security > Critical Bugs > Performance > Code Quality",
      "Skip low-severity items if time is short. A focused report of 3-5 critical findings",
      "is more valuable than a superficial scan of everything.",
    ].join("\n"),
    context: "Focus area or specific files to review (leave blank for full scan):\n",
    goals: ["Map structure", "Critical bug scan", "Security audit", "Report findings"],
    suggestedSkills: ["systematic-debugging"],
    defaultModel: "",
    timeoutMinutes: 15,
  },
  {
    id: "debug",
    name: "Debug & Fix",
    icon: "Bug",
    color: "pink",
    description: "Diagnose and fix a specific issue",
    instruction: [
      "You are a debugger. Your job is to reproduce, diagnose, and fix the reported issue.",
      "",
      "Steps:",
      "1. Reproduce the issue — run the code, trigger the error, capture the exact failure",
      "2. Trace the root cause — follow the execution path, inspect logs, check recent changes",
      "3. Identify the fix — determine the minimal change needed to resolve the issue",
      "4. Implement the fix — make the change, ensure no regressions",
      "5. Verify — run tests, re-trigger the original scenario, confirm the fix works",
      "6. Document — summarise what was broken, why, and what you changed",
      "",
      "If you cannot reproduce the issue, explain what you tried and what information is still needed.",
    ].join("\n"),
    context: "Describe the issue (error message, steps to reproduce, expected vs actual):\n",
    goals: ["Reproduce the issue", "Trace root cause", "Implement fix", "Verify & document"],
    suggestedSkills: ["systematic-debugging"],
    defaultModel: "",
    timeoutMinutes: 20,
  },
  {
    id: "devops",
    name: "DevOps Maintenance",
    icon: "Activity",
    color: "cyan",
    description: "Maintain, monitor, and improve infrastructure and deployment pipelines",
    instruction: [
      "You are a DevOps engineer. Maintain and improve the reliability, performance, and security of existing infrastructure.",
      "",
      "Steps:",
      "1. Assess current state — review existing setup, identify technical debt, outdated configs, or reliability gaps",
      "2. Prioritise improvements — rank issues by impact (security > reliability > performance > convenience)",
      "3. Implement changes — make infrastructure/config updates incrementally, one concern at a time",
      "4. Test — verify each change works in the target environment before moving to the next",
      "5. Document — update relevant docs, README, runbooks, and change logs",
      "",
      "Prefer simple, reproducible setups. Always test before declaring success.",
      "If destructive changes are needed, flag them clearly and explain the risk.",
      "Focus on keeping things running smoothly rather than building new features.",
    ].join("\n"),
    context: "Maintenance task description (what needs attention):\n",
    goals: ["Assess current state", "Prioritise improvements", "Implement & configure", "Test & document"],
    suggestedSkills: [],
    defaultModel: "",
    timeoutMinutes: 20,
  },
];

// ── GET ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const missionId = url.searchParams.get("id");

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
              custom.push({ ...tmpl, isCustom: true });
            } catch {}
          }
        } catch {}
      }

      return NextResponse.json({ data: { templates: [...builtIn, ...custom] } });
    }

    // Derive mission status from cron job state
    function deriveMissionStatus(m: MissionRecord, job: CronJobData | null): MissionRecord {
      if (!job || m.status === "completed" || m.status === "failed" || m.status === "draft") return m;

      // Cron job explicitly paused by user (cancel action)
      if (job.state === "paused" && !job.enabled) {
        m.status = "failed";
        m.error = "Cancelled by user";
        m.updatedAt = new Date().toISOString();
        return m;
      }

      // Check session completion if the job has run
      if (job.last_run_at) {
        // Find the most recent session for this cron job
        const sessions = findSessionsForCronJob(job.id);
        if (sessions.length > 0) {
          const latestSessionId = sessions[0].id;
          const sessionPath = SESSIONS_DIR + "/" + latestSessionId + ".json";
          try {
            const sessionData = JSON.parse(readFileSync(sessionPath, "utf-8"));
            const messages: SessionMessage[] = sessionData.messages || [];
            const validation = validateSessionCompletion(messages);

            if (!validation.completed) {
              // Session did NOT complete successfully — this is a failure
              m.status = "failed";
              m.error = `Session ${validation.reason}${validation.timedOut ? " (timed out)" : ""}`;
              m.updatedAt = new Date().toISOString();
              return m;
            }
          } catch {}
        }

        // Fall back to cron job status if session validation passes or no session found
        if (job.last_status) {
          if (job.last_status === "ok") {
            const repeat = job.repeat;
            const isOneShot = typeof repeat === "object" && repeat.times === 1;
            m.status = isOneShot ? "completed" : "running";
          } else {
            m.status = "failed";
            m.error = `Cron job status: ${job.last_status}`;
          }
          m.updatedAt = new Date().toISOString();
        } else if (job.state === "running") {
          m.status = "running";
        }
      }
      return m;
    }

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
        if (job) {
          // Derive display state from actual job state and timing
          let derivedState = job.state || "unknown";
          // If the scheduler explicitly set "running", respect it
          if (derivedState !== "running") {
            if (job.enabled !== false && job.next_run_at) {
              const nextRun = new Date(job.next_run_at).getTime();
              if (nextRun <= Date.now()) {
                if (job.last_run_at) {
                  derivedState = "active";
                } else if (derivedState === "scheduled") {
                  derivedState = "queued";
                }
              }
            }
          }

          cronJob = {
            id: job.id,
            name: job.name,
            state: derivedState,
            enabled: job.enabled !== false,
            lastRun: job.last_run_at || null,
            nextRun: job.next_run_at || null,
            lastStatus: job.last_status || null,
            schedule: typeof job.schedule === "object" ? job.schedule.display || "" : String(job.schedule || ""),
          };
          sessions = findSessionsForCronJob(job.id);

          // Sync mission status with cron
          deriveMissionStatus(mission, job);
          // Sync cronJob.state with derived mission status
          const syncState = mission.status === "running" ? "running"
            : mission.status === "completed" ? "completed"
            : mission.status === "failed" ? "failed"
            : derivedState;
          cronJob.state = syncState;
        } else if (mission.dispatchMode === "now" && mission.status === "dispatched") {
          // One-shot cron job was deleted after completion — validate session before marking completed
          const sessions = findSessionsForCronJob(mission.cronJobId || "");
          if (sessions.length > 0) {
            const sessionPath = SESSIONS_DIR + "/" + sessions[0].id + ".json";
            try {
              const sessionData = JSON.parse(readFileSync(sessionPath, "utf-8"));
              const messages: SessionMessage[] = sessionData.messages || [];
              const validation = validateSessionCompletion(messages);
              if (!validation.completed) {
                mission.status = "failed";
                mission.error = `Session ${validation.reason}${validation.timedOut ? " (timed out)" : ""}`;
              } else {
                mission.status = "completed";
              }
            } catch {
              mission.status = "completed"; // fallback if session can't be read
            }
          } else {
            mission.status = "completed"; // no session found, assume completed
          }
          mission.updatedAt = new Date().toISOString();
        }
      }

      return NextResponse.json({ data: { mission, cronJob, sessions } });
    }

    // List all missions with linked cron status
    ensureDir();
    const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")) : [];
    const missions: Array<MissionRecord & { cronJob?: { state: string; lastRun: string | null; lastStatus: string | null } }> = [];

    // PERFORMANCE: Read cron jobs once, build lookup map instead of re-reading per mission
    const allCronJobs = readCronJobs();
    const cronJobMap = new Map(allCronJobs.map((j) => [j.mission_id, j]));

    for (const file of files) {
      try {
        const content = readFileSync(DATA_DIR + "/" + file, "utf-8");
        const m: MissionRecord = JSON.parse(content);

        // Attach cron job status if linked, and derive mission status
        if (m.cronJobId) {
          const job = cronJobMap.get(m.id) || null;
          if (job) {
            // Derive display state
            let derivedState = job.state || "unknown";
            if (derivedState !== "running") {
              if (job.enabled !== false && job.next_run_at) {
                const nextRun = new Date(job.next_run_at).getTime();
                if (nextRun <= Date.now()) {
                  if (job.last_run_at) {
                    derivedState = "active";
                  } else if (derivedState === "scheduled") {
                    derivedState = "queued";
                  }
                }
              }
            }
            // Sync mission status from cron job state
            deriveMissionStatus(m, job);
            // After deriveMissionStatus, sync cronJob.state with derived mission status
            const syncState = m.status === "running" ? "running"
              : m.status === "completed" ? "completed"
              : m.status === "failed" ? "failed"
              : derivedState;
            (m as MissionRecord & { cronJob: unknown }).cronJob = {
              state: syncState,
              enabled: job.enabled !== false,
              lastRun: job.last_run_at || null,
              lastStatus: job.last_status || null,
            };
          } else if (m.dispatchMode === "now" && m.status === "dispatched") {
            // One-shot cron job was deleted — validate session before marking completed
            const sessions = findSessionsForCronJob(m.cronJobId || "");
            if (sessions.length > 0) {
              const sessionPath = SESSIONS_DIR + "/" + sessions[0].id + ".json";
              try {
                const sessionData = JSON.parse(readFileSync(sessionPath, "utf-8"));
                const messages: SessionMessage[] = sessionData.messages || [];
                const validation = validateSessionCompletion(messages);
                if (!validation.completed) {
                  m.status = "failed";
                  m.error = `Session ${validation.reason}${validation.timedOut ? " (timed out)" : ""}`;
                } else {
                  m.status = "completed";
                }
              } catch {
                m.status = "completed";
              }
            } else {
              m.status = "completed";
            }
            m.updatedAt = new Date().toISOString();
          }
        }

        missions.push(m as MissionRecord & { cronJob?: { state: string; lastRun: string | null; lastStatus: string | null } });
      } catch {}
    }

    missions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      data: {
        missions,
        total: missions.length,
        active: missions.filter((m) => m.status === "running" || m.status === "dispatched").length,
        completed: missions.filter((m) => m.status === "completed").length,
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
        status: "draft",
        dispatchMode,
        createdAt: now,
        updatedAt: now,
        results: null,
        duration: null,
        error: null,
        templateId: body.templateId || undefined,
      };

      // Parse schedule string into cron schedule object
      function parseSchedule(scheduleStr: string): { schedule: CronJobData["schedule"]; schedule_display: string } {
        const s = scheduleStr.trim().toLowerCase();

        // "every Xh Xm" or "every Xm" or "every Xh"
        const intervalMatch = s.match(/^every\s+(\d+)\s*(m|h|d|w)(?:\s+(\d+)\s*(m|h))?$/);
        if (intervalMatch) {
          let minutes = parseInt(intervalMatch[1]);
          const unit1 = intervalMatch[2];
          if (unit1 === "h") minutes *= 60;
          else if (unit1 === "d") minutes *= 1440;
          else if (unit1 === "w") minutes *= 10080;
          if (intervalMatch[3]) {
            let extra = parseInt(intervalMatch[3]);
            if (intervalMatch[4] === "h") extra *= 60;
            minutes += extra;
          }
          const display = minutes >= 1440
            ? `every ${minutes / 1440}d`
            : minutes >= 60
            ? `every ${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
            : `every ${minutes}m`;
          return { schedule: { kind: "interval", minutes, display }, schedule_display: display };
        }

        // Standard cron expression (5 fields: min hour dom month dow)
        const cronMatch = s.match(/^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)$/);
        if (cronMatch) {
          return {
            schedule: { kind: "cron", expr: cronMatch[1], display: cronMatch[1] },
            schedule_display: cronMatch[1],
          };
        }

        // Default: every 15m
        return {
          schedule: { kind: "interval", minutes: 15, display: "every 15m" },
          schedule_display: "every 15m",
        };
      }

      // If dispatch mode is "now" or "cron", create a real cron job
      if (dispatchMode !== "save") {
        const cronId = "mission-" + id;

        // Build enhanced prompt with goal tracking, time budget, and scope constraints
        let missionPrompt = record.prompt;

        // Look up template timeout if applicable
        const templateDef = record.templateId ? TEMPLATES.find(t => t.id === record.templateId) : null;
        const timeoutMinutes = templateDef?.timeoutMinutes || 10;

        // Add time budget warning — cron jobs have ~10 min inactivity timeout
        const timeBudgetSection =
          `## TIME BUDGET\n` +
          `You have approximately ${timeoutMinutes} minutes. This is a HARD LIMIT — the session will be killed after ${timeoutMinutes} minutes of inactivity.\n` +
          `Plan accordingly. Do NOT attempt work that cannot be completed in this window.\n\n`;

        // Add delegation constraints
        const delegationSection =
          `## DELEGATION RULES\n` +
          `- You may delegate UP TO 3 subtasks in ONE round. Do NOT delegate multiple rounds.\n` +
          `- After receiving delegation results, SYNTHESIZE and produce your final report.\n` +
          `- If time is running short, skip delegation and work directly.\n` +
          `- Set max_iterations to 30 for each delegated subtask to prevent runaway execution.\n\n`;

        if (record.goals.length > 0) {
          missionPrompt =
            `## Goals (complete each in order)\n` +
            record.goals.map((g, i) => `${i + 1}. [ ] ${g}`).join("\n") +
            `\n\nMark each goal as done by including "GOAL_DONE: <goal text>" in your response when you finish each one.\n\n` +
            `---\n\n${timeBudgetSection}${delegationSection}${record.prompt}`;
        } else {
          missionPrompt = `---\n\n${timeBudgetSection}${delegationSection}${record.prompt}`;
        }

        const parsed = dispatchMode === "cron"
          ? parseSchedule(body.schedule || "every 15m")
          : { schedule: { kind: "once", run_at: now, display: "once (immediate)" }, schedule_display: "once (immediate)" };

        const defaults = getDefaultModelConfig();

        const cronJob: CronJobData = {
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
          next_run_at: now, // Fire immediately for "now", or on next tick for "cron"
          mission_id: id,
        };

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

      const path = DATA_DIR + "/" + missionId + ".json";
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
      mission.updatedAt = new Date().toISOString();
      saveMission(mission);

      // Sync to cron job if linked and recurring
      if (mission.cronJobId) {
        const jobs = readCronJobs();
        const idx = jobs.findIndex((j) => j.id === mission.cronJobId);
        if (idx !== -1) {
          if (body.prompt !== undefined || body.goals !== undefined) {
            let missionPrompt = mission.prompt;
            const templateDef = mission.templateId ? TEMPLATES.find(t => t.id === mission.templateId) : null;
            const timeoutMinutes = templateDef?.timeoutMinutes || 10;
            const timeBudgetSection =
              `## TIME BUDGET\n` +
              `You have approximately ${timeoutMinutes} minutes. This is a HARD LIMIT — the session will be killed after ${timeoutMinutes} minutes of inactivity.\n` +
              `Plan accordingly. Do NOT attempt work that cannot be completed in this window.\n\n`;
            const delegationSection =
              `## DELEGATION RULES\n` +
              `- You may delegate UP TO 3 subtasks in ONE round. Do NOT delegate multiple rounds.\n` +
              `- After receiving delegation results, SYNTHESIZE and produce your final report.\n` +
              `- If time is running short, skip delegation and work directly.\n` +
              `- Set max_iterations to 30 for each delegated subtask to prevent runaway execution.\n\n`;
            if (mission.goals.length > 0) {
              missionPrompt =
                `## Goals (complete each in order)\n` +
                mission.goals.map((g: string, i: number) => `${i + 1}. [ ] ${g}`).join("\n") +
                `\n\nMark each goal as done by including "GOAL_DONE: <goal text>" in your response when you finish each one.\n\n` +
                `---\n\n${timeBudgetSection}${delegationSection}${mission.prompt}`;
            } else {
              missionPrompt = `---\n\n${timeBudgetSection}${delegationSection}${mission.prompt}`;
            }
            jobs[idx].prompt = missionPrompt;
          }
          if (body.name !== undefined) {
            jobs[idx].name = "Mission: " + mission.name;
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
