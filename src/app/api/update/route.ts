import { NextResponse } from "next/server";
import { execSync, spawn } from "child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { logApiError } from "@/lib/api-logger";

// ═══════════════════════════════════════════════════════════════
// Update API — Version Check + Self-Update + Restart
// ═══════════════════════════════════════════════════════════════
// GET  /api/update          → check for updates
// POST /api/update { action: "update" }  → pull + build + restart
// POST /api/update { action: "restart" } → restart only

const APP_DIR = process.cwd();
const LOCK_FILE = "/tmp/mc-deploy.lock";
const DEPLOY_SCRIPT = APP_DIR + "/scripts/deploy.sh";
const CACHE_FILE = "/tmp/mc-version-cache.json";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {}
}

function checkVersion(): VersionCache {
  // Check cache first
  const cached = getCachedVersion();
  if (cached) return cached;

  try {
    // Fetch latest from origin/main
    runGit("fetch origin main --quiet");

    const localHash = runGit("rev-parse HEAD");
    const remoteHash = runGit("rev-parse origin/main");
    const branch = runGit("rev-parse --abbrev-ref HEAD");

    let commitMessage = "";
    let commitDate = "";
    let behind = 0;

    if (localHash !== remoteHash) {
      // Get details about what's new
      try {
        commitMessage = runGit("log --format='%s' -1 origin/main");
        commitDate = runGit("log --format='%ci' -1 origin/main");
        behind = parseInt(
          runGit(`rev-list --count ${localHash}..${remoteHash}`) || "0",
          10
        );
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
  } catch (error) {
    // If git fails (e.g., not a git repo), return safe defaults
    return {
      localHash: "unknown",
      remoteHash: "unknown",
      updateAvailable: false,
      commitMessage: "",
      commitDate: "",
      behind: 0,
      branch: "unknown",
      lastChecked: new Date().toISOString(),
    };
  }
}

// GET /api/update — check for available updates
export async function GET() {
  try {
    const version = checkVersion();
    return NextResponse.json({ data: version });
  } catch (error) {
    logApiError("GET /api/update", "checking version", error);
    return NextResponse.json(
      { error: "Failed to check version" },
      { status: 500 }
    );
  }
}

// POST /api/update — trigger update or restart
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "update";

    // Check lock
    if (existsSync(LOCK_FILE)) {
      return NextResponse.json(
        { error: "Update already in progress" },
        { status: 409 }
      );
    }

    if (action === "restart") {
      // Simple restart — stop server, then start
      spawnDeploy([
        "sleep", "3", ";",
        "fuser", "-k", "3000/tcp", ";",
        "sleep", "1", ";",
        "cd", APP_DIR, "&&",
        "nohup", "node", "node_modules/next/dist/bin/next",
        "start", "-p", "3000", "-H", "0.0.0.0", "&",
      ]);
      return NextResponse.json({ data: { action: "restart", status: "started" } });
    }

    if (action === "update") {
      // Run git operations while server is still up
      try {
        runGit("fetch origin main --quiet");
        runGit("checkout main --quiet");
        runGit("reset --hard origin/main --quiet");
      } catch (error) {
        logApiError("POST /api/update", "git operations", error);
        return NextResponse.json(
          { error: "Git update failed" },
          { status: 500 }
        );
      }

      // npm install if package files changed
      try {
        const diff = runGit("diff --name-only HEAD@{1} HEAD 2>/dev/null || echo ''");
        if (diff.includes("package")) {
          execSync("npm install --prefer-offline", {
            cwd: APP_DIR,
            encoding: "utf-8",
            timeout: 120000,
            stdio: "pipe",
          });
        }
      } catch (error) {
        logApiError("POST /api/update", "npm install", error);
        return NextResponse.json(
          { error: "npm install failed" },
          { status: 500 }
        );
      }

      // Build
      try {
        execSync("npm run build", {
          cwd: APP_DIR,
          encoding: "utf-8",
          timeout: 180000,
          stdio: "pipe",
        });
      } catch (error) {
        logApiError("POST /api/update", "build", error);
        return NextResponse.json(
          { error: "Build failed — update aborted (server still running)" },
          { status: 500 }
        );
      }

      // Build succeeded — spawn restart via systemd-run
      spawnDeploy([
        "sleep", "3", ";",
        "fuser", "-k", "3000/tcp", ";",
        "sleep", "1", ";",
        "cd", APP_DIR, "&&",
        "nohup", "node", "node_modules/next/dist/bin/next",
        "start", "-p", "3000", "-H", "0.0.0.0", "&",
      ]);

      // Clear version cache
      try { unlinkSync(CACHE_FILE); } catch {}

      const newHash = runGit("rev-parse --short HEAD");
      return NextResponse.json({
        data: { action: "update", status: "started", newHash },
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use 'update' or 'restart'" },
      { status: 400 }
    );
  } catch (error) {
    logApiError("POST /api/update", "processing request", error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

/**
 * Spawn a deploy/restart command via systemd-run.
 * This creates a transient systemd unit that survives server shutdown.
 */
function spawnDeploy(commandParts: string[]): void {
  const shellCommand = commandParts.join(" ");

  // Try systemd-run first (most reliable)
  try {
    spawn("systemd-run", [
      "--user",
      "--unit=mc-deploy",
      "--property=Type=oneshot",
      "bash",
      "-c",
      shellCommand,
    ], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  } catch {}

  // Fallback: spawn directly with nohup (less reliable but works without systemd)
  try {
    spawn("nohup", ["bash", "-c", shellCommand], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch {}
}
