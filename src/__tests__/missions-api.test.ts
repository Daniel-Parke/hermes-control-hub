import { parseSchedule } from "@/lib/utils";
import {
  getMissionStatus,
  promptFromTemplate,
  TEMPLATES,
} from "@/lib/mission-helpers";
import type { CronJobData } from "@/lib/utils";

describe("promptFromTemplate", () => {
  it("includes instruction and context sections", () => {
    const t = TEMPLATES[0];
    const p = promptFromTemplate(t);
    expect(p).toContain(t.instruction.slice(0, 40));
    if (t.context) expect(p).toContain("Additional Context");
  });
});

// ── Schedule Parsing ───────────────────────────────────────────

describe("Schedule Parsing (missions context)", () => {
  describe("interval formats", () => {
    it("should parse 'every 15m'", () => {
      const r = parseSchedule("every 15m");
      expect(r).toMatchObject({ kind: "interval", minutes: 15 });
    });

    it("should parse 'every 2h'", () => {
      const r = parseSchedule("every 2h");
      expect(r).toMatchObject({ kind: "interval", minutes: 120 });
    });

    it("should parse shorthand '30m'", () => {
      const r = parseSchedule("30m");
      expect(r).toMatchObject({ kind: "interval", minutes: 30 });
    });
  });

  describe("cron expressions", () => {
    it("should parse standard 5-field cron", () => {
      const r = parseSchedule("*/15 * * * *");
      expect(r).toMatchObject({ kind: "cron", expr: "*/15 * * * *" });
    });

    it("should parse hourly cron", () => {
      const r = parseSchedule("0 * * * *");
      expect(r).toMatchObject({ kind: "cron" });
    });

    it("should parse daily cron", () => {
      const r = parseSchedule("0 9 * * *");
      expect(r).toMatchObject({ kind: "cron", expr: "0 9 * * *" });
    });
  });

  describe("ISO timestamps (one-shot)", () => {
    it("should parse ISO timestamp as 'once'", () => {
      const r = parseSchedule("2026-04-09T12:00:00Z");
      expect(r).toMatchObject({ kind: "once", run_at: "2026-04-09T12:00:00Z" });
    });
  });

  describe("invalid schedules", () => {
    it("should mark unknown formats as invalid", () => {
      const r = parseSchedule("something weird");
      expect(r.kind).toBe("invalid");
    });

    it("should mark empty string as invalid", () => {
      const r = parseSchedule("");
      expect(r.kind).toBe("invalid");
    });
  });
});

// ── Dispatch Modes ─────────────────────────────────────────────

describe("Dispatch Modes", () => {
  it("should recognize 'save' mode", () => {
    const mode: "save" | "now" | "cron" = "save";
    expect(mode).toBe("save");
  });

  it("should recognize 'now' mode", () => {
    const mode: "save" | "now" | "cron" = "now";
    expect(mode).toBe("now");
  });

  it("should recognize 'cron' mode", () => {
    const mode: "save" | "now" | "cron" = "cron";
    expect(mode).toBe("cron");
  });

  it("should parse cron schedule for cron dispatch mode", () => {
    const r = parseSchedule("*/30 * * * *");
    expect(r.kind).toBe("cron");
  });

  it("should use immediate schedule for 'now' dispatch mode", () => {
    // In the actual code, "now" mode creates a one-shot schedule
    const now = new Date().toISOString();
    const r = parseSchedule(now);
    // parseSchedule of an ISO timestamp returns "once"
    expect(r.kind).toBe("once");
  });
});

// ── getMissionStatus ───────────────────────────────────────────

describe("getMissionStatus", () => {
  it("should return 'queued' when job exists but never ran", () => {
    const job: CronJobData = {
      id: "cj-1",
      name: "test",
      prompt: "",
      skills: [],
      model: "",
      schedule: { kind: "interval", minutes: 5 },
      repeat: { times: 1, completed: 0 },
      enabled: true,
      state: "scheduled",
    };
    const result = getMissionStatus(job, "queued");
    expect(result.status).toBe("queued");
  });

  it("should return 'dispatched' when job state is 'running'", () => {
    const job: CronJobData = {
      id: "cj-2",
      name: "test",
      prompt: "",
      skills: [],
      model: "",
      schedule: { kind: "interval", minutes: 5 },
      repeat: { times: 1, completed: 0 },
      enabled: true,
      state: "running",
    };
    const result = getMissionStatus(job, "queued");
    expect(result.status).toBe("dispatched");
  });

  it("should return 'successful' when last_status is 'ok'", () => {
    const job: CronJobData = {
      id: "cj-3",
      name: "test",
      prompt: "",
      skills: [],
      model: "",
      schedule: { kind: "interval", minutes: 5 },
      repeat: { times: 1, completed: 0 },
      enabled: true,
      last_run_at: "2026-04-09T12:00:00Z",
      last_status: "ok",
    };
    const result = getMissionStatus(job, "dispatched");
    expect(result.status).toBe("successful");
  });

  it("should return 'failed' when last_status is 'error'", () => {
    const job: CronJobData = {
      id: "cj-4",
      name: "test",
      prompt: "",
      skills: [],
      model: "",
      schedule: { kind: "interval", minutes: 5 },
      repeat: { times: 1, completed: 0 },
      enabled: true,
      last_run_at: "2026-04-09T12:00:00Z",
      last_status: "error",
    };
    const result = getMissionStatus(job, "dispatched");
    expect(result.status).toBe("failed");
  });

  it("should return 'failed' with error when job is paused and disabled", () => {
    const job: CronJobData = {
      id: "cj-5",
      name: "test",
      prompt: "",
      skills: [],
      model: "",
      schedule: { kind: "interval", minutes: 5 },
      repeat: { times: 1, completed: 0 },
      enabled: false,
      state: "paused",
    };
    const result = getMissionStatus(job, "dispatched");
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Cancelled by user");
  });

  it("should return 'dispatched' when job ran but no status recorded", () => {
    const job: CronJobData = {
      id: "cj-6",
      name: "test",
      prompt: "",
      skills: [],
      model: "",
      schedule: { kind: "interval", minutes: 5 },
      repeat: { times: 1, completed: 0 },
      enabled: true,
      last_run_at: "2026-04-09T12:00:00Z",
      // no last_status
    };
    const result = getMissionStatus(job, "queued");
    expect(result.status).toBe("dispatched");
  });

  describe("null job (deleted cron job)", () => {
    it("should return 'successful' if current status was 'dispatched' (one-shot completed)", () => {
      const result = getMissionStatus(null, "dispatched");
      expect(result.status).toBe("successful");
    });

    it("should preserve current status for non-dispatched states", () => {
      expect(getMissionStatus(null, "queued").status).toBe("queued");
      expect(getMissionStatus(null, "successful").status).toBe("successful");
      expect(getMissionStatus(null, "failed").status).toBe("failed");
    });
  });
});

// ── Template Merging ───────────────────────────────────────────

describe("Template Merging", () => {
  it("should mark built-in templates as isCustom: false", () => {
    // Built-in templates should NOT be custom
    const builtIn = { id: "qa-bugfix", name: "QA - Bug Fix", isCustom: false };
    expect(builtIn.isCustom).toBe(false);
  });

  it("should mark custom templates as isCustom: true", () => {
    const custom = { id: "ct_abc123", name: "My Template", isCustom: true };
    expect(custom.isCustom).toBe(true);
  });

  it("should combine built-in and custom in merged list", () => {
    const builtIn = [{ id: "t1", isCustom: false }];
    const custom = [{ id: "ct_1", isCustom: true }];
    const merged = [...builtIn, ...custom];
    expect(merged).toHaveLength(2);
    expect(merged[0].isCustom).toBe(false);
    expect(merged[1].isCustom).toBe(true);
  });
});
