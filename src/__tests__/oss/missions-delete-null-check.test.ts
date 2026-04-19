/** @jest-environment node */

/**
 * Regression test: mission delete action must return 404 when
 * loadMission returns null (corrupt or missing mission data),
 * not silently proceed to delete the file and leave orphaned cron jobs.
 */

const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockUnlinkSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: mockUnlinkSync,
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: {
    config: "/tmp/test-hermes/config.yaml",
    env: "/tmp/test-hermes/.env",
    cronJobs: "/tmp/test-hermes/cron/jobs.json",
    backups: "/tmp/test-hermes/backups",
    sessions: "/tmp/test-hermes/sessions",
    missions: "/tmp/test-hermes/missions",
    templates: "/tmp/test-hermes/templates",
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

const mockWithJobsFileLock = jest.fn();

jest.mock("@/lib/jobs-repository", () => ({
  readJobsFile: jest.fn(),
  withJobsFileLock: (...args: unknown[]) => mockWithJobsFileLock(...args),
}));

const mockLoadMission = jest.fn();
const mockSaveMission = jest.fn();
const mockGetMissionsDataDir = jest.fn(() => "/tmp/test-hermes/missions");

jest.mock("@/lib/missions-repository", () => ({
  ensureMissionsDir: jest.fn(),
  getMissionsDataDir: (...args: unknown[]) => mockGetMissionsDataDir(...args),
  loadMission: (...args: unknown[]) => mockLoadMission(...args),
  saveMission: (...args: unknown[]) => mockSaveMission(...args),
  sanitizeMissionId: jest.fn((id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "")),
}));

jest.mock("@/lib/mission-helpers", () => ({
  buildMissionPrompt: jest.fn((m: unknown) => String(m)),
  getMissionStatus: jest.fn((_job: unknown, status: string) => ({ status })),
  TEMPLATES: [],
}));

import { NextRequest } from "next/server";

function makeDeleteRequest(missionId: string): NextRequest {
  return new NextRequest("http://localhost/api/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "delete", missionId }),
  });
}

describe("POST /api/missions — delete action returns 404 for missing mission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadMission.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockUnlinkSync.mockImplementation(() => {});
  });

  it("returns 404 when loadMission returns null", async () => {
    const { POST } = await import("@/app/api/missions/route");
    const req = makeDeleteRequest("m_nonexistent");
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("does NOT delete the file when loadMission returns null", async () => {
    const { POST } = await import("@/app/api/missions/route");
    const req = makeDeleteRequest("m_nonexistent");
    await POST(req);

    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it("does NOT attempt to remove cron job when loadMission returns null", async () => {
    const { POST } = await import("@/app/api/missions/route");
    const req = makeDeleteRequest("m_nonexistent");
    await POST(req);

    expect(mockWithJobsFileLock).not.toHaveBeenCalled();
  });

  it("successfully deletes when mission exists", async () => {
    mockLoadMission.mockReturnValue({
      id: "m_existing",
      name: "Test",
      cronJobId: null,
    });

    const { POST } = await import("@/app/api/missions/route");
    const req = makeDeleteRequest("m_existing");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});
