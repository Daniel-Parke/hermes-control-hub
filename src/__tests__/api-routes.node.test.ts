/** @jest-environment node */
/**
 * Integration tests: real Next.js route handlers with an isolated temp HERMES_HOME.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { NextRequest } from "next/server";

function prepHome(): string {
  const tmpHome = mkdtempSync(join(tmpdir(), "mc-route-"));
  const dataRoot = join(tmpHome, "mission-control", "data");
  process.env.HERMES_HOME = tmpHome;
  process.env.MC_DATA_DIR = dataRoot;
  mkdirSync(join(tmpHome, "sessions"), { recursive: true });
  mkdirSync(join(dataRoot, "missions"), {
    recursive: true,
  });
  mkdirSync(join(dataRoot, "templates"), {
    recursive: true,
  });
  mkdirSync(join(dataRoot, "operations"), {
    recursive: true,
  });
  return tmpHome;
}

function cleanup(tmpHome: string): void {
  rmSync(tmpHome, { recursive: true, force: true });
}

describe("API route handlers (temp HERMES_HOME)", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = prepHome();
    jest.resetModules();
  });

  afterEach(() => {
    cleanup(tmpHome);
  });

  it("GET /api/status returns data and 200", async () => {
    const { GET } = await import("@/app/api/status/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      soulFile: false,
      configFile: false,
      skillsCount: 0,
      sessionsCount: 0,
    });
    expect(typeof body.data.memorySize).toBe("string");
    expect(body.data.timestamp).toMatch(/^\d{4}-/);
  });

  it("GET /api/monitor returns aggregated monitor payload", async () => {
    const { GET } = await import("@/app/api/monitor/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      cron: expect.objectContaining({ total: 0, jobs: [] }),
      sessions: expect.objectContaining({ total: 0 }),
      gateway: expect.objectContaining({ connectedCount: 0 }),
      memory: expect.objectContaining({ factCount: 0 }),
      errors: [],
      capabilities: expect.objectContaining({
        jobsJsonReadable: true,
        configPresent: false,
      }),
    });
  });

  it("GET /api/config returns empty object when config.yaml is missing", async () => {
    const { GET } = await import("@/app/api/config/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({});
  });

  it("GET /api/config returns masked config when config.yaml exists", async () => {
    const configPath = join(tmpHome, "config.yaml");
    writeFileSync(
      configPath,
      "display:\n  theme: dark\nmodel:\n  api_key: sk-test-secret-key\n",
      "utf-8"
    );
    jest.resetModules();
    const { GET } = await import("@/app/api/config/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.display).toEqual({ theme: "dark" });
    expect(String((body.data as { model?: { api_key?: string } }).model?.api_key)).toContain(
      "••••"
    );
  });

  it("GET /api/missions?action=templates merges built-in templates", async () => {
    const { GET } = await import("@/app/api/missions/route");
    const req = new Request("http://localhost/api/missions?action=templates");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.templates)).toBe(true);
    expect(body.data.templates.length).toBeGreaterThan(0);
  });

  it("GET /api/operations lists empty operations", async () => {
    const { GET } = await import("@/app/api/operations/route");
    const res = await GET(new NextRequest("http://localhost/api/operations"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.operations).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("GET /api/missions lists empty missions", async () => {
    const { GET } = await import("@/app/api/missions/route");
    const req = new Request("http://localhost/api/missions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.missions).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("GET /api/sessions returns empty list when directory missing", async () => {
    rmSync(join(tmpHome, "sessions"), { recursive: true, force: true });
    jest.resetModules();
    const { GET } = await import("@/app/api/sessions/route");
    const res = await GET(new NextRequest("http://localhost/api/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.sessions).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("GET /api/sessions lists session files", async () => {
    writeFileSync(
      join(tmpHome, "sessions", "session_test.json"),
      "{}",
      "utf-8"
    );
    jest.resetModules();
    const { GET } = await import("@/app/api/sessions/route");
    const res = await GET(new NextRequest("http://localhost/api/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBe(1);
    expect(body.data.sessions[0].filename).toBe("session_test.json");
  });
});

describe("sessions API safeguards (temp HERMES_HOME)", () => {
  let tmpHome: string | undefined;
  const prevRate = process.env.SESSIONS_API_RATE_LIMIT_MAX;
  const prevMaxBytes = process.env.MAX_SESSION_FILE_BYTES;

  afterEach(() => {
    if (tmpHome) cleanup(tmpHome);
    tmpHome = undefined;
    if (prevRate !== undefined) process.env.SESSIONS_API_RATE_LIMIT_MAX = prevRate;
    else delete process.env.SESSIONS_API_RATE_LIMIT_MAX;
    if (prevMaxBytes !== undefined) process.env.MAX_SESSION_FILE_BYTES = prevMaxBytes;
    else delete process.env.MAX_SESSION_FILE_BYTES;
    jest.resetModules();
  });

  it("GET /api/sessions returns 429 when rate limit exceeded", async () => {
    process.env.SESSIONS_API_RATE_LIMIT_MAX = "2";
    delete process.env.MAX_SESSION_FILE_BYTES;
    tmpHome = prepHome();
    jest.resetModules();
    const { resetSessionsApiRateLimitForTests } = await import(
      "@/lib/sessions-api-guard"
    );
    resetSessionsApiRateLimitForTests();
    const { GET } = await import("@/app/api/sessions/route");
    const mk = () => new NextRequest("http://127.0.0.1/api/sessions");
    expect((await GET(mk())).status).toBe(200);
    expect((await GET(mk())).status).toBe(200);
    const res = await GET(mk());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("GET /api/sessions/[id] returns 413 when file exceeds max bytes", async () => {
    delete process.env.SESSIONS_API_RATE_LIMIT_MAX;
    process.env.MAX_SESSION_FILE_BYTES = "16";
    tmpHome = prepHome();
    writeFileSync(
      join(tmpHome, "sessions", "huge.json"),
      "x".repeat(32),
      "utf-8"
    );
    jest.resetModules();
    const { resetSessionsApiRateLimitForTests } = await import(
      "@/lib/sessions-api-guard"
    );
    resetSessionsApiRateLimitForTests();
    const { GET } = await import("@/app/api/sessions/[id]/route");
    const req = new NextRequest("http://localhost/api/sessions/huge");
    const res = await GET(req, { params: Promise.resolve({ id: "huge" }) });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(String(body.error)).toContain("too large");
  });
});
