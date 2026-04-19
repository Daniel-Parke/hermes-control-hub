import {
  getScopeLabel,
  missionTimeToDevHours,
  buildGoalsSection,
  buildMissionPrompt,
  getMissionStatus,
  promptFromTemplate,
} from "@/lib/mission-helpers";
import type { CronJobData } from "@/lib/utils";

describe("getScopeLabel", () => {
  it("returns 'Quick Pass' for <= 10 min", () => {
    expect(getScopeLabel(5)).toBe("Quick Pass");
    expect(getScopeLabel(10)).toBe("Quick Pass");
  });

  it("returns 'Half Day' for 11-15 min", () => {
    expect(getScopeLabel(15)).toBe("Half Day");
  });

  it("returns 'Full Day' for 21-30 min", () => {
    expect(getScopeLabel(30)).toBe("Full Day");
  });

  it("returns 'Sprint' for > 45 min", () => {
    expect(getScopeLabel(60)).toBe("Sprint");
    expect(getScopeLabel(120)).toBe("Sprint");
  });
});

describe("missionTimeToDevHours", () => {
  it("converts 15 min agent time to 4 dev hours", () => {
    expect(missionTimeToDevHours(15)).toBe(4);
  });

  it("converts 60 min agent time to 16 dev hours", () => {
    expect(missionTimeToDevHours(60)).toBe(16);
  });

  it("rounds to nearest integer", () => {
    expect(missionTimeToDevHours(10)).toBe(Math.round(10 * 16 / 60));
  });
});

describe("buildGoalsSection", () => {
  it("formats goals as numbered checklist", () => {
    const result = buildGoalsSection(["Fix bug", "Add tests"]);
    expect(result).toContain("1. [ ] Fix bug");
    expect(result).toContain("2. [ ] Add tests");
    expect(result).toContain("GOAL_DONE");
  });

  it("handles empty goals", () => {
    const result = buildGoalsSection([]);
    expect(result).toContain("## Goals");
  });
});

describe("buildMissionPrompt", () => {
  it("includes scope and safety sections", () => {
    const result = buildMissionPrompt({
      prompt: "Do the thing",
      goals: [],
      missionTimeMinutes: 15,
      timeoutMinutes: 10,
    });
    expect(result).toContain("MISSION SCOPE");
    expect(result).toContain("SAFETY LIMITS");
    expect(result).toContain("Do the thing");
  });

  it("includes goals section when goals present", () => {
    const result = buildMissionPrompt({
      prompt: "Do the thing",
      goals: ["Goal 1"],
      missionTimeMinutes: 15,
      timeoutMinutes: 10,
    });
    expect(result).toContain("## Goals");
    expect(result).toContain("1. [ ] Goal 1");
  });

  it("does not include goals section when empty", () => {
    const result = buildMissionPrompt({
      prompt: "Do the thing",
      goals: [],
      missionTimeMinutes: 15,
      timeoutMinutes: 10,
    });
    expect(result).not.toContain("1. [ ]");
  });
});

describe("getMissionStatus", () => {
  it("returns 'successful' when job deleted and was dispatched", () => {
    expect(getMissionStatus(null, "dispatched")).toEqual({ status: "successful" });
  });

  it("returns current status when job deleted and not dispatched", () => {
    expect(getMissionStatus(null, "queued")).toEqual({ status: "queued" });
  });

  it("returns 'failed' when job paused and disabled", () => {
    const job = { state: "paused", enabled: false } as CronJobData;
    const result = getMissionStatus(job, "dispatched");
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Cancelled");
  });

  it("returns 'dispatched' when job is running", () => {
    const job = { state: "running", enabled: true, last_status: "ok" } as CronJobData;
    expect(getMissionStatus(job, "dispatched")).toEqual({ status: "dispatched" });
  });

  it("returns 'queued' when job never ran", () => {
    const job = { state: "scheduled", enabled: true, last_run_at: null } as CronJobData;
    expect(getMissionStatus(job, "queued")).toEqual({ status: "queued" });
  });

  it("returns 'successful' when last_status is ok", () => {
    const job = { state: "scheduled", enabled: true, last_run_at: "2026-01-01", last_status: "ok" } as CronJobData;
    expect(getMissionStatus(job, "dispatched")).toEqual({ status: "successful" });
  });

  it("returns 'failed' when last_status is error", () => {
    const job = { state: "scheduled", enabled: true, last_run_at: "2026-01-01", last_status: "error" } as CronJobData;
    expect(getMissionStatus(job, "dispatched")).toEqual({ status: "failed" });
  });

  it("returns 'dispatched' when ran but no status yet", () => {
    const job = { state: "scheduled", enabled: true, last_run_at: "2026-01-01", last_status: null } as CronJobData;
    expect(getMissionStatus(job, "dispatched")).toEqual({ status: "dispatched" });
  });
});

describe("promptFromTemplate", () => {
  it("combines instruction and context", () => {
    const result = promptFromTemplate({
      id: "test", name: "Test", icon: "", color: "", category: "",
      profile: "", description: "", instruction: "Do X",
      context: "Details here", goals: [], suggestedSkills: [],
    });
    expect(result).toContain("Do X");
    expect(result).toContain("## Additional Context");
    expect(result).toContain("Details here");
  });

  it("omits context section when empty", () => {
    const result = promptFromTemplate({
      id: "test", name: "Test", icon: "", color: "", category: "",
      profile: "", description: "", instruction: "Do X",
      context: "", goals: [], suggestedSkills: [],
    });
    expect(result).toBe("Do X");
  });
});
