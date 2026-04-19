/** @jest-environment node */

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  mkdirSync: mockMkdirSync,
  rmSync: jest.fn(),
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: {
    config: "/tmp/test-hermes/config.yaml",
    env: "/tmp/test-hermes/.env",
    cronJobs: "/tmp/test-hermes/cron/jobs.json",
    backups: "/tmp/test-hermes/backups",
    sessions: "/tmp/test-hermes/sessions",
    skills: "/tmp/test-hermes/skills",
  },
  getDefaultModelConfig: () => ({ provider: "nous", model: "xiaomi/mimo-v2-pro" }),
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

jest.mock("@/lib/api-auth", () => ({
  requireMcApiKey: jest.fn(() => null),
  requireNotReadOnly: jest.fn(() => null),
}));

jest.mock("@/lib/audit-log", () => ({
  appendAuditLine: jest.fn(),
}));

jest.mock("@/lib/jobs-repository", () => ({
  readJobsFile: jest.fn(() => ({
    ok: true,
    jobs: [
      { id: "job1", name: "Test Job", prompt: "test", enabled: true, state: "scheduled", schedule: { kind: "interval", minutes: 5, display: "every 5m" }, repeat: { times: -1, completed: 0 }, skills: [], model: "", last_run_at: null, next_run_at: null },
    ],
  })),
  withJobsFileLock: jest.fn((_path, fn) => fn()),
}));

jest.mock("@/lib/sessions-api-guard", () => ({
  sessionsRateLimitResponse: jest.fn(() => null),
}));

import { NextRequest } from "next/server";

describe("GET /api/cron", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns list of cron jobs", async () => {
    const { GET } = await import("@/app/api/cron/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.jobs).toHaveLength(1);
    expect(data.data.jobs[0].id).toBe("job1");
    expect(data.data.jobs[0].name).toBe("Test Job");
  });
});

describe("GET /api/tools", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns available toolsets", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("platform_toolsets:\n  cli:\n    - terminal\n    - file\ntoolsets:\n  - terminal\n  - file\n");

    const request = new NextRequest("http://localhost/api/tools");
    const { GET } = await import("@/app/api/tools/route");
    const res = await GET(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.available).toBeDefined();
    expect(data.data.available.terminal).toBeDefined();
    expect(data.data.available.browser).toBeDefined();
    expect(data.data.activeToolsets).toContain("terminal");
  });

  it("returns 404 when config not found", async () => {
    mockExistsSync.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/tools");
    const { GET } = await import("@/app/api/tools/route");
    const res = await GET(request);

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/tools", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects missing platform", async () => {
    const request = new NextRequest("http://localhost/api/tools", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toolsets: ["terminal"] }),
    });
    const { PUT } = await import("@/app/api/tools/route");
    const res = await PUT(request);

    expect(res.status).toBe(400);
  });

  it("updates toolset config", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("platform_toolsets:\n  cli:\n    - old\n");

    const request = new NextRequest("http://localhost/api/tools", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "cli", toolsets: ["terminal", "file"] }),
    });
    const { PUT } = await import("@/app/api/tools/route");
    const res = await PUT(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});

describe("GET /api/config", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns parsed config", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("agent:\n  max_turns: 100\nmodel:\n  default: test-model\n");

    const { GET } = await import("@/app/api/config/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
  });
});

describe("GET /api/skills", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty when no skills directory", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith("skills")) return false;
      return false;
    });

    const { NextRequest } = await import("next/server");
    const request = new NextRequest("http://localhost/api/skills");
    const { GET } = await import("@/app/api/skills/route");
    const res = await GET(request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.total).toBe(0);
  });
});

describe("GET /api/templates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns custom templates", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["test-template.json"]);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      id: "custom-1", name: "Custom Template", instruction: "Do stuff",
    }));

    const { GET } = await import("@/app/api/templates/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.templates).toBeDefined();
  });
});

describe("GET /api/memory", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns memory data with provider info", async () => {
    mockExistsSync.mockReturnValue(false);

    const { GET } = await import("@/app/api/memory/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.provider).toBeDefined();
  });
});
