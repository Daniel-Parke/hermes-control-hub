import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { logApiError } from "@/lib/api-logger";

const DATA_DIR = PATHS.missions;
const CRON_PATH = PATHS.cronJobs;
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface HealthReport {
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  missions: {
    total: number;
    active: number;
    stuck: Array<{ id: string; name: string; age: string; status: string }>;
  };
  cron: {
    total: number;
    running: number;
    stuck: Array<{ id: string; name: string; state: string }>;
  };
  gateway: {
    running: boolean;
    lastTick?: string;
  };
}

export async function GET() {
  try {
    const report: HealthReport = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      missions: { total: 0, active: 0, stuck: [] },
      cron: { total: 0, running: 0, stuck: [] },
      gateway: { running: false },
    };

    // Check missions
    if (existsSync(DATA_DIR)) {
      const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
      report.missions.total = files.length;

      for (const file of files) {
        try {
          const m = JSON.parse(readFileSync(DATA_DIR + "/" + file, "utf-8"));
          if (m.status === "queued" || m.status === "dispatched") {
            report.missions.active++;
            const age = Date.now() - new Date(m.createdAt).getTime();
            if (age > STALE_THRESHOLD_MS) {
              report.missions.stuck.push({
                id: m.id,
                name: m.name,
                age: Math.round(age / 60000) + "m",
                status: m.status,
              });
            }
          }
        } catch {}
      }
    }

    // Check cron jobs
    if (existsSync(CRON_PATH)) {
      try {
        const data = JSON.parse(readFileSync(CRON_PATH, "utf-8"));
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        report.cron.total = jobs.length;

        for (const job of jobs) {
          if (job.state === "running") {
            report.cron.running++;
            // Check if running too long
            if (job.last_run_at) {
              const runAge = Date.now() - new Date(job.last_run_at).getTime();
              if (runAge > STALE_THRESHOLD_MS) {
                report.cron.stuck.push({
                  id: job.id,
                  name: job.name || job.id,
                  state: "running too long (" + Math.round(runAge / 60000) + "m)",
                });
              }
            }
          }
        }
      } catch {}
    }

    // Check gateway
    try {
      const ps = execSync('ps aux | grep "gateway run" | grep -v grep | wc -l', { encoding: "utf-8", timeout: 5000 });
      report.gateway.running = parseInt(ps.trim()) > 0;
    } catch {}

    // Determine overall status
    if (report.missions.stuck.length > 0 || report.cron.stuck.length > 0) {
      report.status = "degraded";
    }
    if (!report.gateway.running && report.missions.active > 0) {
      report.status = "critical";
    }

    return NextResponse.json({ data: report });
  } catch (err) {
    logApiError("GET /api/missions/health", "checking mission health", err);
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
