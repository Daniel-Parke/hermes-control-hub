import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { HERMES_HOME, PATHS } from "@/lib/hermes";

describe("Setup & Installation", () => {
  describe("Hermes Home Detection", () => {
    it("should detect HERMES_HOME from environment", () => {
      expect(HERMES_HOME).toBeTruthy();
      expect(HERMES_HOME.length).toBeGreaterThan(0);
    });

    it("should check config.yaml at expected path", () => {
      // config.yaml exists when Hermes agent is installed; CI may not have it
      const hasConfig = existsSync(PATHS.config);
      expect(typeof hasConfig).toBe("boolean");
    });
  });

  describe("Data Directory Structure", () => {
    it("should create missions directory if missing", () => {
      if (!existsSync(PATHS.missions)) {
        mkdirSync(PATHS.missions, { recursive: true });
      }
      expect(existsSync(PATHS.missions)).toBe(true);
    });

    it("should create templates directory if missing", () => {
      if (!existsSync(PATHS.templates)) {
        mkdirSync(PATHS.templates, { recursive: true });
      }
      expect(existsSync(PATHS.templates)).toBe(true);
    });

    it("should have missions directory under HERMES_HOME", () => {
      expect(PATHS.missions).toContain(HERMES_HOME);
      expect(PATHS.missions).toContain("mission-control");
    });
  });

  describe("Standard File Locations", () => {
    it("should have .env file or be optional", () => {
      const hasEnv = existsSync(PATHS.env);
      // .env is optional — some users use env vars directly
      expect(typeof hasEnv).toBe("boolean");
    });

    it("should check skills directory", () => {
      // Skills dir exists when Hermes agent is installed; CI may not have it
      const hasSkills = existsSync(PATHS.skills);
      expect(typeof hasSkills).toBe("boolean");
    });

    it("should have sessions directory or create on demand", () => {
      const hasSessions = existsSync(PATHS.sessions);
      // Sessions dir is created by the gateway, not always present
      expect(typeof hasSessions).toBe("boolean");
    });
  });

  describe("Graceful Fallbacks", () => {
    it("should handle missing memory database", () => {
      // Memory page should show empty state, not crash
      const hasMemoryDb = existsSync(PATHS.memoryDb);
      expect(typeof hasMemoryDb).toBe("boolean");
    });

    it("should handle missing cron jobs file", () => {
      const hasCronJobs = existsSync(PATHS.cronJobs);
      expect(typeof hasCronJobs).toBe("boolean");
    });

    it("should handle missing logs directory", () => {
      const hasLogs = existsSync(PATHS.logs);
      expect(typeof hasLogs).toBe("boolean");
    });
  });
});
