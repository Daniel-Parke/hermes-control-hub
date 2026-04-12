import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { execSync } from "child_process";

import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { ApiResponse } from "@/types/hermes";
import { logApiError } from "@/lib/api-logger";

interface AgentRun {
  id: string;
  type: "cron" | "gateway" | "manual" | "subagent";
  name: string;
  status: "running" | "idle";
  startedAt: string | null;
  lastActivity: string | null;
  model: string;
  pid: number | null;
  turns: number;
}

export async function GET() {
  try {
    const agents: AgentRun[] = [];

    // ── Gateway main agent ───────────────────────────────────
    try {
      const psOutput = execSync(
        'ps aux | grep "gateway run" | grep -v grep | grep -v bash',
        { encoding: "utf-8", timeout: 5000 }
      ).trim();
      if (psOutput) {
        const lines = psOutput.split("\n");
        // De-duplicate: only keep one gateway entry (the main python process)
        const seen = new Set<number>();
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1], 10);
          const cmd = parts.slice(10).join(" ");
          // Skip bash wrapper processes, keep the actual python process
          if (cmd.includes("bash") || cmd.includes("printf")) continue;
          if (seen.has(pid)) continue;
          seen.add(pid);

          const startTime = parts[8];

          // Determine connected platforms from .env
          const platforms: string[] = [];
          try {
            const envPath = PATHS.env;
            if (existsSync(envPath)) {
              const envContent = readFileSync(envPath, "utf-8");
              if (envContent.includes("DISCORD_BOT_TOKEN=") && !envContent.match(/^#\s*DISCORD_BOT_TOKEN/m)) platforms.push("Discord");
              if (envContent.includes("TELEGRAM_BOT_TOKEN=") && !envContent.match(/^#\s*TELEGRAM_BOT_TOKEN/m)) platforms.push("Telegram");
              if (envContent.includes("SLACK_BOT_TOKEN=") && !envContent.match(/^#\s*SLACK_BOT_TOKEN/m)) platforms.push("Slack");
            }
          } catch (err) { logApiError("GET /api/agents", "reading .env for platforms", err); }
          const platformLabel = platforms.length > 0 ? platforms.join(" + ") : "Gateway";

          agents.push({
            id: `gateway-${pid}`,
            type: "gateway",
            name: `Hermes Gateway (${platformLabel})`,
            status: "running",
            startedAt: startTime,
            lastActivity: new Date().toISOString(),
            model: "gateway",
            pid,
            turns: 0,
          });
          break; // Only show one gateway
        }
      }
    } catch (err) {
      logApiError("GET /api/agents", "checking gateway process", err);
    }

    // ── Cron job runs (from session files) ───────────────────
    const sessionsPath = PATHS.sessions;
    if (existsSync(sessionsPath)) {
      try {
        const files = readdirSync(sessionsPath);
        const cronSessionFiles = files
          .filter((f) => f.startsWith("session_cron_") && f.endsWith(".json"))
          .sort()
          .reverse();

        // Get last session per cron job
        const seenJobs = new Set<string>();
        for (const file of cronSessionFiles) {
          // Extract job ID: session_cron_84f9f4d893f4_20260409_123246.json
          const match = file.match(/session_cron_([a-f0-9]+)_/);
          if (!match) continue;
          const jobId = match[1];
          if (seenJobs.has(jobId)) continue;
          seenJobs.add(jobId);

          const fp = sessionsPath + "/" + file;
          const st = statSync(fp);
          const modified = st.mtime.toISOString();

          // Get job name from cron config
          let jobName = `Cron ${jobId.slice(0, 8)}`;
          let jobModel = "unknown";
          const cronPath = PATHS.cronJobs;
          if (existsSync(cronPath)) {
            try {
              const cronData = JSON.parse(readFileSync(cronPath, "utf-8"));
              const job = (cronData.jobs || []).find(
                (j: { id: string }) => j.id === jobId
              );
              if (job) {
                jobName = job.name || jobName;
                jobModel = job.model || "unknown";
              }
            } catch (err) {
              logApiError("GET /api/agents", "reading cron config for job " + jobId, err);
            }
          }

          // Count turns from session data
          let turns = 0;
          try {
            const sessionData = JSON.parse(readFileSync(fp, "utf-8"));
            if (Array.isArray(sessionData.messages)) {
              turns = sessionData.messages.filter(
                (m: { role: string }) => m.role === "assistant"
              ).length;
            }
          } catch (err) {
            logApiError("GET /api/agents", "counting turns for session " + file, err);
          }

          // Is this session recent (within 15 min)?
          const ageMs = Date.now() - st.mtimeMs;
          const isRunning = ageMs < 15 * 60 * 1000;

          agents.push({
            id: `cron-${jobId}`,
            type: "cron",
            name: jobName,
            status: isRunning ? "running" : "idle",
            startedAt: file.match(/_(\d{8}_\d{6})\.json/)?.[1] || null,
            lastActivity: modified,
            model: jobModel,
            pid: null,
            turns,
          });
        }
      } catch (err) {
        logApiError("GET /api/agents", "reading cron session files", err);
      }
    }

    // ── Subagents (delegate tool sessions) ───────────────────
    try {
      const subagentOutput = execSync(
        'ps aux | grep -E "run_agent|AIAgent|hermes.*chat" | grep -v grep | grep -v "gateway run"',
        { encoding: "utf-8", timeout: 5000 }
      ).trim();
      if (subagentOutput) {
        const lines = subagentOutput.split("\n");
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1], 10);
          const cmd = parts.slice(10).join(" ");
          agents.push({
            id: `subagent-${pid}`,
            type: "subagent",
            name: `Subagent (PID ${pid})`,
            status: "running",
            startedAt: parts[8],
            lastActivity: new Date().toISOString(),
            model: "unknown",
            pid,
            turns: 0,
          });
        }
      }
    } catch {
      // grep returns exit code 1 when no matches found — expected, not an error
    }

    // Sort: running first, then by type
    agents.sort((a, b) => {
      if (a.status === "running" && b.status !== "running") return -1;
      if (a.status !== "running" && b.status === "running") return 1;
      return a.type.localeCompare(b.type);
    });

    const runningCount = agents.filter((a) => a.status === "running").length;
    const idleCount = agents.filter((a) => a.status === "idle").length;

    return NextResponse.json({
      data: {
        agents,
        total: agents.length,
        running: runningCount,
        idle: idleCount,
      },
    });
  } catch (err) {
    logApiError("GET /api/agents", "querying agents", err);
    return NextResponse.json(
      { error: "Failed to query agents: " + String(err) },
      { status: 500 }
    );
  }
}
