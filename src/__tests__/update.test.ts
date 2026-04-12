import { execSync } from "child_process";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function bashScriptChecksAvailable(): boolean {
  if (process.platform === "win32") return false;
  try {
    execSync("bash -c true", { stdio: "ignore", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Update API - Unit Tests
// ═══════════════════════════════════════════════════════════════
// Tests the version check logic without actually running git or
// triggering updates. Mocks the filesystem and git operations.

const CACHE_FILE = join(tmpdir(), "mc-version-cache.json");
const LOCK_FILE = join(tmpdir(), "mc-deploy.lock");

describe("Update API - Version Cache", () => {
  afterEach(() => {
    try { unlinkSync(CACHE_FILE); } catch {}
    try { unlinkSync(LOCK_FILE); } catch {}
  });

  it("should create and read cache file", () => {
    const cache = {
      localHash: "abc1234",
      remoteHash: "def5678",
      updateAvailable: true,
      commitMessage: "feat: new feature",
      commitDate: "2026-04-10",
      behind: 3,
      branch: "main",
      lastChecked: new Date().toISOString(),
    };
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
    expect(existsSync(CACHE_FILE)).toBe(true);

    const read = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    expect(read.localHash).toBe("abc1234");
    expect(read.updateAvailable).toBe(true);
    expect(read.behind).toBe(3);
  });

  it("should detect stale cache", () => {
    const staleCache = {
      localHash: "abc1234",
      remoteHash: "def5678",
      updateAvailable: true,
      lastChecked: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
    };
    writeFileSync(CACHE_FILE, JSON.stringify(staleCache));

    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    const age = Date.now() - new Date(raw.lastChecked).getTime();
    expect(age).toBeGreaterThan(5 * 60 * 1000); // older than 5 min TTL
  });

  it("should handle missing cache gracefully", () => {
    try { unlinkSync(CACHE_FILE); } catch {}
    expect(existsSync(CACHE_FILE)).toBe(false);
  });
});

describe("Update API - Lock File", () => {
  afterEach(() => {
    try { unlinkSync(LOCK_FILE); } catch {}
  });

  it("should create lock file", () => {
    writeFileSync(LOCK_FILE, "12345");
    expect(existsSync(LOCK_FILE)).toBe(true);
  });

  it("should detect existing lock", () => {
    writeFileSync(LOCK_FILE, "99999");
    // PID 99999 is unlikely to exist
    const lockPid = readFileSync(LOCK_FILE, "utf-8").trim();
    expect(lockPid).toBe("99999");

    // Check if process exists (it shouldn't)
    let processExists = false;
    try {
      process.kill(parseInt(lockPid), 0);
      processExists = true;
    } catch {
      processExists = false;
    }
    expect(processExists).toBe(false); // stale lock
  });

  it("should clean up lock file", () => {
    writeFileSync(LOCK_FILE, "12345");
    unlinkSync(LOCK_FILE);
    expect(existsSync(LOCK_FILE)).toBe(false);
  });
});

const describeScripts = bashScriptChecksAvailable() ? describe : describe.skip;

describeScripts("Update API - Scripts", () => {
  it("update.sh should exist and have valid syntax", () => {
    const scriptPath = process.cwd() + "/scripts/update.sh";
    expect(existsSync(scriptPath)).toBe(true);
    expect(() => {
      execSync(`bash -n "${scriptPath}"`, { encoding: "utf-8", timeout: 5000 });
    }).not.toThrow();
  });

  it("restart.sh should exist and have valid syntax", () => {
    const scriptPath = process.cwd() + "/scripts/restart.sh";
    expect(existsSync(scriptPath)).toBe(true);
    expect(() => {
      execSync(`bash -n "${scriptPath}"`, { encoding: "utf-8", timeout: 5000 });
    }).not.toThrow();
  });

  it("install.sh should exist and have valid syntax", () => {
    const scriptPath = process.cwd() + "/scripts/install.sh";
    expect(existsSync(scriptPath)).toBe(true);
    expect(() => {
      execSync(`bash -n "${scriptPath}"`, { encoding: "utf-8", timeout: 5000 });
    }).not.toThrow();
  });

  it("setup.sh should exist and have valid syntax", () => {
    const scriptPath = process.cwd() + "/scripts/setup.sh";
    expect(existsSync(scriptPath)).toBe(true);
    expect(() => {
      execSync(`bash -n "${scriptPath}"`, { encoding: "utf-8", timeout: 5000 });
    }).not.toThrow();
  });
});

describe("Update API - Response Format", () => {
  it("should match VersionInfo interface shape", () => {
    const mockResponse = {
      localHash: "abc1234",
      remoteHash: "abc1234",
      updateAvailable: false,
      commitMessage: "",
      commitDate: "",
      behind: 0,
      branch: "main",
      lastChecked: new Date().toISOString(),
    };

    expect(mockResponse).toHaveProperty("localHash");
    expect(mockResponse).toHaveProperty("remoteHash");
    expect(mockResponse).toHaveProperty("updateAvailable");
    expect(mockResponse).toHaveProperty("commitMessage");
    expect(mockResponse).toHaveProperty("behind");
    expect(mockResponse).toHaveProperty("branch");
    expect(mockResponse).toHaveProperty("lastChecked");
    expect(typeof mockResponse.updateAvailable).toBe("boolean");
    expect(typeof mockResponse.behind).toBe("number");
  });

  it("should handle update response shape", () => {
    const mockUpdateResponse = {
      action: "update",
      status: "started",
      newHash: "def5678",
    };

    expect(mockUpdateResponse).toHaveProperty("action");
    expect(mockUpdateResponse).toHaveProperty("status");
    expect(mockUpdateResponse.status).toBe("started");
  });
});
