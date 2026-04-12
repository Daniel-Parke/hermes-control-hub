import { NextRequest, NextResponse } from "next/server";
import { execFileSync, execSync, spawn } from "child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

import { logApiError } from "@/lib/api-logger";
import { requireDeployApiEnabled, requireMcApiKey } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";

// ═══════════════════════════════════════════════════════════════
// Update API — Version Check + Update + Restart
// ═══════════════════════════════════════════════════════════════
// GET  /api/update                       → check for updates
// POST /api/update { action: "update" }  → pull + build + restart (gated)
// POST /api/update { action: "restart" } → restart only (gated)
//
// MC_ENABLE_DEPLOY_API=true required for POST.
// MC_API_KEY optional; when set, require X-MC-API-Key or Bearer.
// MC_UPDATE_GIT_BRANCH (default main) — remote tracking branch for deploy.

const APP_DIR = process.cwd();
const LOCK_FILE = tmpdir() + "/mc-deploy.lock";
const UPDATE_SCRIPT = APP_DIR + "/scripts/update.sh";
const RESTART_SCRIPT = APP_DIR + "/scripts/restart.sh";
const CACHE_FILE = tmpdir() + "/mc-version-cache.json";
const CACHE_TTL_MS = 5 * 60 * 1000;

const UPDATE_BRANCH = sanitizeGitBranch(
  process.env.MC_UPDATE_GIT_BRANCH || "main"
);

function sanitizeGitBranch(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9._/-]/g, "").slice(0, 200);
  return s || "main";
}

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

function runGit(args: string[]): string {
  return execFileSync("git", args, {
    cwd: APP_DIR,
    encoding: "utf-8",
    timeout: 30000,
  }).trim();
}

function getCachedVersion(): VersionCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    if (Date.now() - new Date(raw.lastChecked).getTime() > CACHE_TTL_MS)
      return null;
    return raw;
  } catch {
    return null;
  }
}

function saveVersionCache(cache: VersionCache): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // ignore
  }
}

function checkVersion(): VersionCache {
  const cached = getCachedVersion();
  if (cached) return cached;

  try {
    runGit(["fetch", "origin", UPDATE_BRANCH, "--quiet"]);
    const localHash = runGit(["rev-parse", "HEAD"]);
    const remoteRef = "origin/" + UPDATE_BRANCH;
    const remoteHash = runGit(["rev-parse", remoteRef]);
    const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);

    let commitMessage = "";
    let commitDate = "";
    let behind = 0;

    if (localHash !== remoteHash) {
      try {
        commitMessage = runGit(["log", "--format=%s", "-1", remoteRef]);
        commitDate = runGit(["log", "--format=%ci", "-1", remoteRef]);
        behind = parseInt(
          runGit(["rev-list", "--count", localHash + ".." + remoteHash]) || "0",
          10
        );
      } catch {
        // ignore
      }
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
export async function POST(request: NextRequest) {
  const gated = requireDeployApiEnabled();
  if (gated) return gated;

  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "update";

    if (existsSync(LOCK_FILE)) {
      return NextResponse.json(
        { error: "Update already in progress" },
        { status: 409 }
      );
    }

    if (action === "restart") {
      spawnScript(RESTART_SCRIPT);
      appendAuditLine({
        action: "deploy.restart",
        resource: "update",
        ok: true,
      });
      return NextResponse.json({ data: { action: "restart", status: "started" } });
    }

    if (action === "update") {
      try {
        runGit(["fetch", "origin", UPDATE_BRANCH, "--quiet"]);
        runGit(["checkout", UPDATE_BRANCH, "--quiet"]);
        runGit(["reset", "--hard", "origin/" + UPDATE_BRANCH, "--quiet"]);
      } catch (error) {
        logApiError("POST /api/update", "git operations", error);
        appendAuditLine({
          action: "deploy.update",
          resource: "git",
          ok: false,
          detail: "git failed",
        });
        return NextResponse.json({ error: "Git update failed" }, { status: 500 });
      }

      try {
        const diff = execSync(
          'git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo ""',
          { cwd: APP_DIR, encoding: "utf-8", timeout: 30000 }
        );
        if (diff.includes("package")) {
          execSync("npm install --prefer-offline", {
            cwd: APP_DIR,
            timeout: 120000,
            stdio: "pipe",
          });
        }
      } catch (error) {
        logApiError("POST /api/update", "npm install", error);
        appendAuditLine({
          action: "deploy.update",
          resource: "npm",
          ok: false,
        });
        return NextResponse.json({ error: "npm install failed" }, { status: 500 });
      }

      try {
        execSync("npm run build", {
          cwd: APP_DIR,
          timeout: 180000,
          stdio: "pipe",
        });
      } catch (error) {
        logApiError("POST /api/update", "build", error);
        appendAuditLine({
          action: "deploy.update",
          resource: "build",
          ok: false,
        });
        return NextResponse.json(
          {
            error: "Build failed — update aborted (server still running)",
          },
          { status: 500 }
        );
      }

      spawnScript(UPDATE_SCRIPT);
      try {
        unlinkSync(CACHE_FILE);
      } catch {
        // ignore
      }

      let short = "";
      try {
        short = runGit(["rev-parse", "--short", "HEAD"]);
      } catch {
        // ignore
      }

      appendAuditLine({
        action: "deploy.update",
        resource: "full",
        ok: true,
        detail: short,
      });

      return NextResponse.json({
        data: { action: "update", status: "started", newHash: short },
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use 'update' or 'restart'" },
      { status: 400 }
    );
  } catch (error) {
    logApiError("POST /api/update", "processing request", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

function spawnScript(scriptPath: string): void {
  const command = `sleep 3; bash "${scriptPath}"`;

  try {
    spawn(
      "systemd-run",
      [
        "--user",
        "--unit=mc-action",
        "--property=Type=oneshot",
        "bash",
        "-c",
        command,
      ],
      { detached: true, stdio: "ignore" }
    ).unref();
    return;
  } catch {
    // fall through
  }

  try {
    spawn("nohup", ["bash", "-c", command], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch {
    // ignore
  }
}
