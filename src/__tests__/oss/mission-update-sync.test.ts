/** @jest-environment node */

/**
 * Regression test: mission update action must sync skills and profile
 * to the associated cron job. Previously, only prompt/timeout/name/schedule
 * were synced — skills and profile changes were silently lost.
 */

const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  readdirSync: mockReaddirSync,
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const mockMission = {
  id: "m_test123",
  name: "Test Mission",
  prompt: "Original prompt",
  goals: ["Goal 1"],
  skills: ["old-skill"],
  model: "test-model",
  profile: "old-profile",
  missionTimeMinutes: 15,
  timeoutMinutes: 10,
  schedule: "every 5m",
  status: "dispatched",
  dispatchMode: "cron",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  results: null,
  duration: null,
  error: null,
  templateId: null,
  cronJobId: "mission-m_test123",
};

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
const mockReadJobsFile = jest.fn();

jest.mock("@/lib/jobs-repository", () => ({
  readJobsFile: (...args: unknown[]) => mockReadJobsFile(...args),
  withJobsFileLock: (...args: unknown[]) => mockWithJobsFileLock(...args),
}));

jest.mock("@/lib/missions-repository", () => ({
  ensureMissionsDir: jest.fn(),
  getMissionsDataDir: jest.fn(() => "/tmp/test-hermes/missions"),
  loadMission: jest.fn(() => ({ ...mockMission })),
  saveMission: jest.fn(),
  sanitizeMissionId: jest.fn((id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "")),
}));

import { NextRequest } from "next/server";

function makeUpdateRequest(fields: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "update", missionId: "m_test123", ...fields }),
  });
}

describe("POST /api/missions — update action syncs skills/profile to cron job", () => {
  let capturedCallback: ((jobs: unknown[]) => unknown) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = null;

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockMission));

    mockWithJobsFileLock.mockImplementation(
      (_path: string, _backup: string, fn: (jobs: unknown[]) => unknown) => {
        capturedCallback = fn;
        const result = fn([
          {
            id: "mission-m_test123",
            name: "Mission: Test Mission",
            prompt: "Original prompt",
            skills: ["old-skill"],
            model: "test-model",
            profile: "old-profile",
            enabled: true,
            state: "scheduled",
            schedule: { kind: "interval", minutes: 5, display: "every 5m" },
            repeat: { times: null, completed: 0 },
            mission_id: "m_test123",
            timeout: 600,
          },
        ]);
        return { ok: true, value: result };
      }
    );
  });

  it("syncs skills to cron job when mission skills are updated", async () => {
    const { POST } = await import("@/app/api/missions/route");
    const req = makeUpdateRequest({ skills: ["new-skill-1", "new-skill-2"] });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockWithJobsFileLock).toHaveBeenCalled();

    // Verify the callback modified the job's skills
    expect(capturedCallback).not.toBeNull();
    const jobs = [
      {
        id: "mission-m_test123",
        name: "Mission: Test Mission",
        prompt: "Original prompt",
        skills: ["old-skill"],
        model: "test-model",
        profile: "old-profile",
        enabled: true,
        state: "scheduled",
        schedule: { kind: "interval", minutes: 5, display: "every 5m" },
        repeat: { times: null, completed: 0 },
        mission_id: "m_test123",
        timeout: 600,
      },
    ];
    const result = capturedCallback!(jobs) as { action: string; jobs: Array<Record<string, unknown>> };
    expect(result.action).toBe("write");
    expect(result.jobs[0].skills).toEqual(["new-skill-1", "new-skill-2"]);
  });

  it("syncs profile to cron job when mission profile is updated", async () => {
    const { POST } = await import("@/app/api/missions/route");
    const req = makeUpdateRequest({ profile: "new-profile" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockWithJobsFileLock).toHaveBeenCalled();

    const jobs = [
      {
        id: "mission-m_test123",
        name: "Mission: Test Mission",
        prompt: "Original prompt",
        skills: ["old-skill"],
        model: "test-model",
        profile: "old-profile",
        enabled: true,
        state: "scheduled",
        schedule: { kind: "interval", minutes: 5, display: "every 5m" },
        repeat: { times: null, completed: 0 },
        mission_id: "m_test123",
        timeout: 600,
      },
    ];
    const result = capturedCallback!(jobs) as { action: string; jobs: Array<Record<string, unknown>> };
    expect(result.jobs[0].profile).toBe("new-profile");
  });

  it("does NOT modify skills when skills field is not in payload", async () => {
    const { POST } = await import("@/app/api/missions/route");
    const req = makeUpdateRequest({ name: "Renamed Mission" });
    const res = await POST(req);

    expect(res.status).toBe(200);

    const jobs = [
      {
        id: "mission-m_test123",
        name: "Mission: Test Mission",
        prompt: "Original prompt",
        skills: ["old-skill"],
        model: "test-model",
        profile: "old-profile",
        enabled: true,
        state: "scheduled",
        schedule: { kind: "interval", minutes: 5, display: "every 5m" },
        repeat: { times: null, completed: 0 },
        mission_id: "m_test123",
        timeout: 600,
      },
    ];
    const result = capturedCallback!(jobs) as { action: string; jobs: Array<Record<string, unknown>> };
    // skills should remain unchanged
    expect(result.jobs[0].skills).toEqual(["old-skill"]);
    // profile should remain unchanged
    expect(result.jobs[0].profile).toBe("old-profile");
    // name should be updated
    expect(result.jobs[0].name).toBe("Mission: Renamed Mission");
  });
});
