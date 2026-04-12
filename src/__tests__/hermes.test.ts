import { HERMES_HOME, PATHS, getConfigValue, getDiscordHomeChannel } from "@/lib/hermes";

describe("Hermes Config Module", () => {
  describe("HERMES_HOME", () => {
    it("should resolve to a non-empty path", () => {
      expect(HERMES_HOME).toBeTruthy();
      expect(HERMES_HOME).toContain(".hermes");
    });
  });

  describe("PATHS", () => {
    it("should define all required paths", () => {
      expect(PATHS.config).toContain("config.yaml");
      expect(PATHS.env).toContain(".env");
      expect(PATHS.soul).toContain("SOUL.md");
      expect(PATHS.hermes).toContain("HERMES.md");
      expect(PATHS.agent).toContain("AGENTS.md");
      expect(PATHS.cronJobs).toContain("jobs.json");
      expect(PATHS.sessions).toContain("sessions");
      expect(PATHS.skills).toContain("skills");
      expect(PATHS.logs).toContain("logs");
      expect(PATHS.memoryDb).toContain("memory_store.db");
      expect(PATHS.missions).toContain("missions");
      expect(PATHS.templates).toContain("templates");
      expect(PATHS.operations).toContain("operations");
    });

    it("should derive all paths from HERMES_HOME", () => {
      expect(PATHS.config.startsWith(HERMES_HOME)).toBe(true);
      expect(PATHS.soul.startsWith(HERMES_HOME)).toBe(true);
      expect(PATHS.sessions.startsWith(HERMES_HOME)).toBe(true);
    });
  });

  describe("getConfigValue", () => {
    it("should read top-level values", () => {
      const yaml = "model:\n  default: test-model\n  provider: nous\n";
      expect(getConfigValue(yaml, "model.default")).toBe("test-model");
      expect(getConfigValue(yaml, "model.provider")).toBe("nous");
    });

    it("should handle quoted values", () => {
      const yaml = 'display:\n  personality: "kawaii"\n';
      expect(getConfigValue(yaml, "display.personality")).toBe("kawaii");
    });

    it("should return empty string for missing keys", () => {
      const yaml = "model:\n  default: test\n";
      expect(getConfigValue(yaml, "model.nonexistent")).toBe("");
      expect(getConfigValue(yaml, "missing.key")).toBe("");
    });
  });

  describe("getDefaultModelConfig", () => {
    it("uses model as alias for default", async () => {
      const { mkdtempSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const t = mkdtempSync(join(tmpdir(), "mc-model-"));
      const prev = process.env.HERMES_HOME;
      process.env.HERMES_HOME = t;
      jest.resetModules();
      try {
        writeFileSync(
          t + "/config.yaml",
          "model:\n  model: from-model-key\n  provider: nous\n",
          "utf-8"
        );
        const { getDefaultModelConfig } = await import("@/lib/hermes");
        const c = getDefaultModelConfig();
        expect(c.model).toBe("from-model-key");
        expect(c.provider).toBe("nous");
      } finally {
        rmSync(t, { recursive: true, force: true });
        if (prev !== undefined) process.env.HERMES_HOME = prev;
        else delete process.env.HERMES_HOME;
        jest.resetModules();
      }
    });
  });

  describe("getDiscordHomeChannel", () => {
    it("should extract channel ID from env", () => {
      const env = "DISCORD_BOT_TOKEN=abc123\nDISCORD_HOME_CHANNEL=123456789\n";
      expect(getDiscordHomeChannel(env)).toBe("123456789");
    });

    it("should handle quoted values", () => {
      const env = 'DISCORD_HOME_CHANNEL="987654321"\n';
      expect(getDiscordHomeChannel(env)).toBe("987654321");
    });

    it("should return empty if not set", () => {
      const env = "DISCORD_BOT_TOKEN=***\n";
      expect(getDiscordHomeChannel(env)).toBe("");
    });
  });
});
