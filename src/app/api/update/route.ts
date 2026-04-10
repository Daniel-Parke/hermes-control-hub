import { NextResponse } from "next/server";
import { execSync, spawn } from "child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { logApiError } from "@/lib/api-logger";

// ═══════════════════════════════════════════════════════════════
// Update API — Version Check + Update + Restart
// ═══════════════════════════════════════════════════════════════
// GET  /api/update                       → check for updates
// POST /api/update { action: "update" }  → pull + build + restart
// POST /api/update { action: "restart" } → restart only

const APP_DIR = process.cwd();
const LOCK_FILE = "/tmp/mc-deploy.lock";
const UPDATE_SCRIPT = APP_DIR + "/scripts/update.sh";
const RESTART_SCRIPT = APP_DIR + "/scripts/restart.sh";
const CACHE_FILE = "/tmp/mc-version-cache.json";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface VersionCache {
  localHash: string;
  remoteHash: string;
  updateAvailable: boolean;
  commitMessage: string;
  commitDate: string;
  behind: number;
  branch: string;
  lastChecked: string;
}

function runGit(args: string): string {
  return execSync(`git ${args}`, {
    cwd: APP_DIR,
    encoding: "utf-8",
    timeout: 30000,
  }).trim();
}

function getCachedVersion(): VersionCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    if (Date.now() - new Date(raw.lastChecked).getTime() > CACHE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function saveVersionCache(cache: VersionCache): void {
  try { writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
}

function checkVersion(): VersionCache {
  const cached = getCachedVersion();
  if (cached) return cached;

  try {
    runGit("fetch origin main --quiet");
    const localHash = runGit("rev-parse HEAD");
    const remoteHash = runGit("rev-parse origin/main");
    const branch = runGit("rev-parse --abbrev-ref HEAD");

    let commitMessage = "";
    let commitDate = "";
    let behind = 0;

    if (localHash !== remoteHash) {
      try {
        commitMessage = runGit("log --format='%s' -1 origin/main");
        commitDate = runGit("log --format='%ci' -1 origin/main");
        behind = parseInt(runGit(`rev-list --count ${localHash}..${remoteHash}`) || "0", 10);
      } catch {}
    }

    const cache: VersionCache = {
      localHash: localHash.substring(0, 7),
      remoteHash: remoteHash.substring(0, 7),
      updateAvailable: localHash !== remoteHash,
      commitMessage,
      commitDate,
      behind,
      branch,
      lastChecked: new Date().toISOString(),
    };
    saveVersionCache(cache);
    return cache;
  } catch {
    return {
      localHash: "unknown", remoteHash: "unknown", updateAvailable: false,
      commitMessage: "", commitDate: "", behind: 0, branch: "unknown",
      lastChecked: new Date().toISOString(),
    };
  }
}

// GET /api/update
export async function GET() {
  try {
    return NextResponse.json({ data: checkVersion() });
  } catch (error) {
    logApiError("GET /api/update", "checking version", error);
    return NextResponse.json({ error: "Failed to check version" }, { status: 500 });
  }
}

// POST /api/update
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "update";

    if (existsSync(LOCK_FILE)) {
      return NextResponse.json({ error: "Update already in progress" }, { status: 409 });
    }

    if (action === "restart") {
      spawnScript(RESTART_SCRIPT);
      return NextResponse.json({ data: { action: "restart", status: "started" } });
    }

    if (action === "update") {
      // Pre-flight: run git ops while server is still up
      try {
        runGit("fetch origin main --quiet");
        runGit("checkout main --quiet");
        runGit("reset --hard origin/main --quiet");
      } catch (error) {
        logApiError("POST /api/update", "git operations", error);
        return NextResponse.json({ error: "Git update failed" }, { status: 500 });
      }

      // npm install if needed
      try {
        const diff = runGit("diff --name-only HEAD@{1} HEAD 2>/dev/null || echo ''");
        if (diff.includes("package")) {
          execSync("npm install --prefer-offline", { cwd: APP_DIR, timeout: 120000, stdio: "pipe" });
        }
      } catch (error) {
        logApiError("POST /api/update", "npm install", error);
        return NextResponse.json({ error: "npm install failed" }, { status: 500 });
      }

      // Build (if this fails, don't restart)
      try {
        execSync("npm run build", { cwd: APP_DIR, timeout: 180000, stdio: "pipe" });
      } catch (error) {
        logApiError("POST /api/update", "build", error);
        return NextResponse.json(
          { error: "Build failed — update aborted (server still running)" },
          { status: 500 }
        );
      }

      // Build succeeded — spawn restart via update.sh (which calls restart.sh)
      spawnScript(UPDATE_SCRIPT);
      try { unlinkSync(CACHE_FILE); } catch {}

      return NextResponse.json({
        data: { action: "update", status: "started", newHash: runGit("rev-parse --short HEAD") },
      });
    }

    return NextResponse.json({ error: "Unknown action. Use 'update' or 'restart'" }, { status: 400 });
  } catch (error) {
    logApiError("POST /api/update", "processing request", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/**
 * Spawn a script via systemd-run (transient unit that survives server shutdown).
 * Falls back to nohup if systemd-run unavailable.
 */
function spawnScript(scriptPath: string): void {
  // Build the command: sleep 3 (let API respond), then run script
  const command = `sleep 3; bash "${scriptPath}"`;

  try {
    spawn("systemd-run", [
      "--user", "--unit=mc-action", "--property=Type=oneshot",
      "bash", "-c", command,
    ], { detached: true, stdio: "ignore" }).unref();
    return;
  } catch {}

  try {
    spawn("nohup", ["bash", "-c", command], {
      detached: true, stdio: "ignore",
    }).unref();
  } catch {}
}
