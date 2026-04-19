/** @jest-environment node */

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: {
    config: "/tmp/test-hermes/config.yaml",
    env: "/tmp/test-hermes/.env",
    sessions: "/tmp/test-hermes/sessions",
    logs: "/tmp/test-hermes/logs",
    cronJobs: "/tmp/test-hermes/cron/jobs.json",
  },
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

jest.mock("@/lib/sessions-api-guard", () => ({
  sessionsRateLimitResponse: jest.fn(() => null),
}));

import { NextRequest } from "next/server";

describe("GET /api/status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns system status with file checks", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["file1.json", "file2.json"]);

    const { GET } = await import("@/app/api/status/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(typeof data.data.soulFile).toBe("boolean");
    expect(typeof data.data.configFile).toBe("boolean");
  });
});

describe("GET /api/gateway", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns gateway status with platforms", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith("config.yaml")) return true;
      if (p.endsWith(".env")) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue("platform_toolsets:\n  cli:\n    - terminal\n");

    const { GET } = await import("@/app/api/gateway/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it("handles missing config gracefully", async () => {
    mockExistsSync.mockReturnValue(false);

    const { GET } = await import("@/app/api/gateway/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
  });
});

describe("GET /api/logs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 when no logs directory", async () => {
    mockExistsSync.mockReturnValue(false);

    const request = new Request("http://localhost/api/logs");
    const { GET } = await import("@/app/api/logs/route");
    const res = await GET(request);

    expect(res.status).toBe(404);
  });

  it("returns log data when logs exist", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith("/logs")) return true;
      if (p.endsWith("agent.log")) return true;
      return false;
    });
    mockReaddirSync.mockReturnValue(["agent.log"]);
    mockStatSync.mockReturnValue({ size: 100, mtime: new Date("2026-01-01") });
    mockReadFileSync.mockReturnValue("[INFO] Started\n[ERROR] Something broke\n");

    const request = new Request("http://localhost/api/logs");
    const { GET } = await import("@/app/api/logs/route");
    const res = await GET(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.lines)).toBe(true);
  });
});

describe("GET /api/sessions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty list when no sessions directory", async () => {
    mockExistsSync.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/sessions");
    const { GET } = await import("@/app/api/sessions/route");
    const res = await GET(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.sessions).toEqual([]);
    expect(data.data.total).toBe(0);
  });

  it("lists session files", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["session_abc.json"]);
    mockStatSync.mockReturnValue({
      size: 1024,
      mtime: new Date("2026-01-01"),
      mtimeMs: Date.now(),
      birthtime: new Date("2026-01-01"),
    });

    const request = new NextRequest("http://localhost/api/sessions");
    const { GET } = await import("@/app/api/sessions/route");
    const res = await GET(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.sessions.length).toBe(1);
    expect(data.data.total).toBe(1);
  });
});

describe("GET /api/monitor", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns aggregated status", async () => {
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);

    const { GET } = await import("@/app/api/monitor/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.cron).toBeDefined();
    expect(data.data.memory).toBeDefined();
  });
});
