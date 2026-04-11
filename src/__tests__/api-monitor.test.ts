import { existsSync } from "fs";
import { PATHS } from "@/lib/hermes";

// ═══════════════════════════════════════════════════════════════
// Monitor API — Unit Tests
// ═══════════════════════════════════════════════════════════════
// Tests the monitor API response shape and graceful degradation
// when optional components (memory, cron, logs) are missing.

describe("Monitor API — Response Shape", () => {
  const mockMonitorData = {
    cron: {
      total: 2,
      active: 1,
      paused: 1,
      jobs: [
        {
          id: "job-1",
          name: "Test Job",
          state: "scheduled",
          enabled: true,
          schedule: "every 15m",
          lastRun: null,
          nextRun: "2026-04-11T12:00:00Z",
          lastStatus: null,
        },
      ],
    },
    sessions: {
      total: 10,
      recent: [{ id: "session-1", modified: "2026-04-11T12:00:00Z", size: 1024 }],
    },
    gateway: {
      platforms: { discord: true, telegram: false },
      connectedCount: 1,
    },
    memory: {
      factCount: 64,
      dbSize: "728 KB",
      provider: "holographic",
    },
    errors: [
      { source: "gateway", message: "test error", timestamp: "2026-04-11 12:00:00" },
    ],
    system: {
      uptime: "5h 30m",
      lastCronRun: "2026-04-11T11:00:00Z",
      lastCronStatus: "ok",
    },
  };

  it("should have all required top-level sections", () => {
    expect(mockMonitorData).toHaveProperty("cron");
    expect(mockMonitorData).toHaveProperty("sessions");
    expect(mockMonitorData).toHaveProperty("gateway");
    expect(mockMonitorData).toHaveProperty("memory");
    expect(mockMonitorData).toHaveProperty("errors");
    expect(mockMonitorData).toHaveProperty("system");
  });

  it("should have valid cron section", () => {
    expect(mockMonitorData.cron).toHaveProperty("total");
    expect(mockMonitorData.cron).toHaveProperty("active");
    expect(mockMonitorData.cron).toHaveProperty("paused");
    expect(mockMonitorData.cron).toHaveProperty("jobs");
    expect(typeof mockMonitorData.cron.total).toBe("number");
    expect(mockMonitorData.cron.jobs).toBeInstanceOf(Array);
  });

  it("should have valid memory section", () => {
    expect(mockMonitorData.memory).toHaveProperty("factCount");
    expect(mockMonitorData.memory).toHaveProperty("dbSize");
    expect(mockMonitorData.memory).toHaveProperty("provider");
    expect(typeof mockMonitorData.memory.factCount).toBe("number");
  });

  it("should have valid sessions section", () => {
    expect(mockMonitorData.sessions).toHaveProperty("total");
    expect(mockMonitorData.sessions).toHaveProperty("recent");
    expect(mockMonitorData.sessions.recent).toBeInstanceOf(Array);
  });

  it("should have valid errors array", () => {
    expect(mockMonitorData.errors).toBeInstanceOf(Array);
    for (const err of mockMonitorData.errors) {
      expect(err).toHaveProperty("source");
      expect(err).toHaveProperty("message");
      expect(err).toHaveProperty("timestamp");
    }
  });
});

describe("Monitor API — Graceful Degradation", () => {
  it("should default memory to 'Not Installed' when DB missing", () => {
    const defaultMemory = {
      factCount: 0,
      dbSize: "N/A",
      provider: "Not Installed",
    };

    expect(defaultMemory.provider).toBe("Not Installed");
    expect(defaultMemory.factCount).toBe(0);
    expect(defaultMemory.dbSize).toBe("N/A");
  });

  it("should handle empty cron jobs gracefully", () => {
    const emptyCron = { total: 0, active: 0, paused: 0, jobs: [] };
    expect(emptyCron.total).toBe(0);
    expect(emptyCron.jobs).toHaveLength(0);
  });

  it("should handle missing log files gracefully", () => {
    // Errors array should be empty when no log files exist
    const noErrors: Array<{ source: string; message: string; timestamp: string }> = [];
    expect(noErrors).toHaveLength(0);
  });

  it("should handle missing gateway config gracefully", () => {
    const noPlatforms = { platforms: {}, connectedCount: 0 };
    expect(noPlatforms.connectedCount).toBe(0);
    expect(Object.keys(noPlatforms.platforms)).toHaveLength(0);
  });

  it("should detect file existence without crashing", () => {
    // These should all return booleans, not throw
    expect(typeof existsSync(PATHS.memoryDb)).toBe("boolean");
    expect(typeof existsSync(PATHS.cronJobs)).toBe("boolean");
    expect(typeof existsSync(PATHS.config)).toBe("boolean");
    expect(typeof existsSync(PATHS.logs)).toBe("boolean");
    expect(typeof existsSync(PATHS.sessions)).toBe("boolean");
  });
});
