import { NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import yaml from "js-yaml";

// Use string concatenation to avoid Turbopack NFT tracing issues
import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { readJobsFile } from "@/lib/jobs-repository";
import type { CronJobData } from "@/lib/utils";

interface MonitorData {
  cron: {
    total: number;
    active: number;
    paused: number;
    jobs: Array<{
      id: string;
      name: string;
      state: string;
      enabled: boolean;
      schedule: string;
      lastRun: string | null;
      nextRun: string | null;
      lastStatus: string | null;
    }>;
  };
  sessions: {
    total: number;
    recent: Array<{
      id: string;
      modified: string;
      size: number;
      model: string;
    }>;
  };
  gateway: {
    platforms: Record<string, boolean>;
    connectedCount: number;
  };
  memory: {
    factCount: number;
    dbSize: string;
    provider: string;
  };
  errors: Array<{
    source: string;
    message: string;
    timestamp: string;
  }>;
  system: {
    uptime: string;
    lastCronRun: string | null;
    lastCronStatus: string | null;
  };
  capabilities: {
    jobsJsonReadable: boolean;
    jobsJsonError: string | null;
    configPresent: boolean;
    memoryProviderFromConfig: string | null;
  };
}

export async function GET() {
  try {
    const data: MonitorData = {
      cron: { total: 0, active: 0, paused: 0, jobs: [] },
      sessions: { total: 0, recent: [] },
      gateway: { platforms: {}, connectedCount: 0 },
      memory: { factCount: 0, dbSize: "N/A", provider: "Not Installed" },
      errors: [],
      system: { uptime: "N/A", lastCronRun: null, lastCronStatus: null },
      capabilities: {
        jobsJsonReadable: true,
        jobsJsonError: null,
        configPresent: false,
        memoryProviderFromConfig: null,
      },
    };

    if (existsSync(PATHS.config)) {
      data.capabilities.configPresent = true;
      try {
        const cfg = yaml.load(readFileSync(PATHS.config, "utf-8")) as Record<
          string,
          unknown
        >;
        const mem = cfg.memory;
        if (mem && typeof mem === "object" && mem !== null) {
          const p = (mem as Record<string, unknown>).provider;
          if (typeof p === "string" && p.trim()) {
            data.capabilities.memoryProviderFromConfig = p.trim();
          }
        }
      } catch (error) {
        logApiError("GET /api/monitor", "parsing config for capabilities", error);
      }
    }

    // ── Cron Jobs ──────────────────────────────────────────────
    const cronPath = PATHS.cronJobs;
    const jobsParsed = readJobsFile(cronPath);
    if (!jobsParsed.ok) {
      data.capabilities.jobsJsonReadable = false;
      data.capabilities.jobsJsonError = jobsParsed.error;
    }
    if (existsSync(cronPath) && jobsParsed.ok) {
      try {
        const jobs = jobsParsed.jobs;
        data.cron.total = jobs.length;
        data.cron.active = jobs.filter(
          (j: { enabled?: boolean }) => j.enabled !== false
        ).length;
        data.cron.paused = jobs.filter(
          (j: { enabled?: boolean }) => j.enabled === false
        ).length;
        data.cron.jobs = jobs.map(
          (j: {
            id: string;
            name?: string;
            state?: string;
            enabled?: boolean;
            schedule?: { display?: string } | string;
            schedule_display?: string;
            last_run_at?: string | null;
            next_run_at?: string | null;
            last_status?: string | null;
          }) => ({
            id: j.id,
            name: j.name || j.id,
            state: j.state || "unknown",
            enabled: j.enabled !== false,
            schedule:
              j.schedule_display ||
              (typeof j.schedule === "object"
                ? j.schedule.display || ""
                : String(j.schedule || "")),
            lastRun: j.last_run_at || null,
            nextRun: j.next_run_at || null,
            lastStatus: j.last_status || null,
          })
        );
        // Find most recent cron run
        const ran = jobs.filter((j: CronJobData) => j.last_run_at);
        if (ran.length > 0) {
          ran.sort((a: CronJobData, b: CronJobData) => {
            const ta = new Date(String(a.last_run_at)).getTime();
            const tb = new Date(String(b.last_run_at)).getTime();
            return tb - ta;
          });
          data.system.lastCronRun = ran[0].last_run_at ?? null;
          data.system.lastCronStatus = ran[0].last_status || null;
        }
      } catch (error) {
        logApiError("GET /api/monitor", "reading cron jobs", error);
      }
    }

    // ── Sessions (recent 10) ───────────────────────────────────
    const sessionsPath = PATHS.sessions;
    if (existsSync(sessionsPath)) {
      try {
        const files = readdirSync(sessionsPath);
        const sessionFiles = files
          .filter((f) => f.endsWith(".json") || f.endsWith(".jsonl"))
          .map((f) => {
            const fp = sessionsPath + "/" + f;
            const st = statSync(fp);
            return { id: f, modified: st.mtime.toISOString(), size: st.size };
          })
          .sort(
            (a, b) =>
              new Date(b.modified).getTime() - new Date(a.modified).getTime()
          );
        data.sessions.total = sessionFiles.length;
        data.sessions.recent = sessionFiles.slice(0, 10).map((s) => ({
          id: s.id.replace(/\.(json|jsonl)$/, ""),
          modified: s.modified,
          size: s.size,
          model: "",
        }));
      } catch (error) { logApiError("GET /api/monitor", "reading sessions", error); }
    }

    // ── Gateway Platforms ──────────────────────────────────────
    const envPath = PATHS.env;
    if (existsSync(envPath)) {
      try {
        const envContent = readFileSync(envPath, "utf-8");
        const envVars: Record<string, string> = {};
        for (const line of envContent.split("\n")) {
          const eqIdx = line.indexOf("=");
          if (eqIdx > 0 && !line.startsWith("#")) {
            const key = line.slice(0, eqIdx).trim();
            const val = line
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            if (val && val !== "changeme") envVars[key] = val;
          }
        }
        const platforms: Record<string, boolean> = {
          telegram: !!envVars.TELEGRAM_BOT_TOKEN,
          discord: !!envVars.DISCORD_BOT_TOKEN,
          slack: !!envVars.SLACK_BOT_TOKEN,
          whatsapp: !!envVars.WHATSAPP_API_KEY || !!envVars.WHATSAPP_PHONE_ID,
        };
        data.gateway.platforms = platforms;
        data.gateway.connectedCount = Object.values(platforms).filter(
          Boolean
        ).length;
      } catch (error) { logApiError("GET /api/monitor", "reading gateway platforms", error); }
    }

    // ── Memory (provider-aware) ──────────────────────────────────
    try {
      const { getMemoryProviderType } = await import("@/lib/memory-providers");
      const providerType = getMemoryProviderType();
      data.memory.provider = providerType === "none" ? "Not Installed" : providerType;

      // For holographic, read SQLite directly for stats
      if (providerType === "holographic") {
        const dbPath = PATHS.memoryDb;
        if (existsSync(dbPath)) {
          const stats = statSync(dbPath);
          const sizeKB = Math.round(stats.size / 1024);
          data.memory.dbSize =
            sizeKB > 1024
              ? (sizeKB / 1024).toFixed(1) + " MB"
              : sizeKB + " KB";

          const Database = (await import("better-sqlite3")).default;
          const db = new Database(dbPath, { readonly: true });
          try {
            const row = db
              .prepare("SELECT COUNT(*) as count FROM facts")
              .get() as { count: number };
            data.memory.factCount = row.count;
          } finally {
            db.close();
          }
        }
      }
      // Hindsight — embedded mode (no external server to check)
      else if (providerType === "hindsight") {
        data.memory.provider = "Hindsight (embedded)";
        data.memory.dbSize = "In-agent";
        data.memory.factCount = -1; // Unknown without agent interaction
      }
    } catch (error) { logApiError("GET /api/monitor", "reading memory stats", error); }

    // ── Recent Errors (from gateway.log) ───────────────────────
    const logPath = PATHS.logs + "/gateway.log";
    if (existsSync(logPath)) {
      try {
        const content = readFileSync(logPath, "utf-8");
        const lines = content.split("\n");
        const errorLines = lines.filter(
          (l) =>
            l.includes(" ERROR ") ||
            l.includes(" CRITICAL ") ||
            l.includes("failed") ||
            l.includes("Error:")
        );
        data.errors = errorLines.slice(-10).map((line) => {
          const tsMatch = line.match(
            /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/
          );
          return {
            source: "gateway",
            message: line.trim(),
            timestamp: tsMatch ? tsMatch[1] : "",
          };
        });
      } catch (error) { logApiError("GET /api/monitor", "reading gateway.log", error); }
    }

    // Also check errors.log
    const errLogPath = PATHS.logs + "/errors.log";
    if (existsSync(errLogPath)) {
      try {
        const content = readFileSync(errLogPath, "utf-8");
        const lines = content
          .split("\n")
          .filter((l) => l.trim())
          .slice(-5);
        for (const line of lines) {
          const tsMatch = line.match(
            /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/
          );
          data.errors.push({
            source: "agent",
            message: line.trim(),
            timestamp: tsMatch ? tsMatch[1] : "",
          });
        }
      } catch (error) { logApiError("GET /api/monitor", "reading errors.log", error); }
    }

    // Sort errors newest first
    data.errors.sort((a, b) => {
      if (a.timestamp && b.timestamp) return b.timestamp.localeCompare(a.timestamp);
      if (a.timestamp) return -1;
      if (b.timestamp) return 1;
      return 0;
    });
    // Keep only most recent 10
    data.errors = data.errors.slice(0, 10);

    return NextResponse.json({ data });
  } catch (error) {
    logApiError("GET /api/monitor", "aggregating monitor data", error);
    return NextResponse.json(
      { error: "Failed to read system monitor data" },
      { status: 500 }
    );
  }
}
