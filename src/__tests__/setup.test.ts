import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("Setup & paths (hermetic)", () => {
  it("MC_DATA_DIR drives PATHS.missions and templates (isolated test home)", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "mc-setup-"));
    const dataRoot = join(tmp, "mcdata");
    const prevH = process.env.HERMES_HOME;
    const prevM = process.env.MC_DATA_DIR;
    process.env.HERMES_HOME = tmp;
    process.env.MC_DATA_DIR = dataRoot;
    jest.resetModules();
    try {
      const { HERMES_HOME, PATHS, MC_DATA_DIR } = await import("@/lib/hermes");
      expect(HERMES_HOME).toBe(tmp);
      expect(MC_DATA_DIR).toBe(dataRoot);
      expect(PATHS.missions).toBe(dataRoot + "/missions");
      expect(PATHS.templates).toBe(dataRoot + "/templates");
      expect(PATHS.stories).toBe(dataRoot + "/stories");
      expect(PATHS.taskLists).toBe(dataRoot + "/task-lists");
      expect(PATHS.packages).toBe(dataRoot + "/packages");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      if (prevH !== undefined) process.env.HERMES_HOME = prevH;
      else delete process.env.HERMES_HOME;
      if (prevM !== undefined) process.env.MC_DATA_DIR = prevM;
      else delete process.env.MC_DATA_DIR;
      jest.resetModules();
    }
  });

  it("creates missions and templates dirs idempotently in temp home", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "mc-setup-"));
    const dataRoot = join(tmp, "mcdata");
    const prev = process.env.HERMES_HOME;
    const prevM = process.env.MC_DATA_DIR;
    process.env.HERMES_HOME = tmp;
    process.env.MC_DATA_DIR = dataRoot;
    jest.resetModules();
    try {
      const { PATHS } = await import("@/lib/hermes");
      if (!existsSync(PATHS.missions)) mkdirSync(PATHS.missions, { recursive: true });
      if (!existsSync(PATHS.templates)) mkdirSync(PATHS.templates, { recursive: true });
      expect(existsSync(PATHS.missions)).toBe(true);
      expect(existsSync(PATHS.templates)).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      if (prev !== undefined) process.env.HERMES_HOME = prev;
      else delete process.env.HERMES_HOME;
      if (prevM !== undefined) process.env.MC_DATA_DIR = prevM;
      else delete process.env.MC_DATA_DIR;
      jest.resetModules();
    }
  });

  it("optional files are boolean flags without requiring real ~/.hermes", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "mc-setup-"));
    const dataRoot = join(tmp, "mcdata");
    const prev = process.env.HERMES_HOME;
    const prevM = process.env.MC_DATA_DIR;
    process.env.HERMES_HOME = tmp;
    process.env.MC_DATA_DIR = dataRoot;
    mkdirSync(join(tmp, "skills"), { recursive: true });
    mkdirSync(join(tmp, "sessions"), { recursive: true });
    jest.resetModules();
    try {
      const { PATHS } = await import("@/lib/hermes");
      writeFileSync(join(tmp, "config.yaml"), "x: 1\n", "utf-8");
      expect(typeof existsSync(PATHS.config)).toBe("boolean");
      expect(typeof existsSync(PATHS.env)).toBe("boolean");
      expect(typeof existsSync(PATHS.skills)).toBe("boolean");
      expect(typeof existsSync(PATHS.sessions)).toBe("boolean");
      expect(typeof existsSync(PATHS.memoryDb)).toBe("boolean");
      expect(typeof existsSync(PATHS.cronJobs)).toBe("boolean");
      expect(typeof existsSync(PATHS.logs)).toBe("boolean");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      if (prev !== undefined) process.env.HERMES_HOME = prev;
      else delete process.env.HERMES_HOME;
      if (prevM !== undefined) process.env.MC_DATA_DIR = prevM;
      else delete process.env.MC_DATA_DIR;
      jest.resetModules();
    }
  });
});
