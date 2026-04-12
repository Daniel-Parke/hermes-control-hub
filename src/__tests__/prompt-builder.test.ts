import {
  getScopeLabel,
  missionTimeToDevHours,
  buildGoalsSection,
  buildMissionPrompt,
} from "@/lib/mission-helpers";

describe("getScopeLabel", () => {
  it("should return 'Quick Pass' for <= 10 minutes", () => {
    expect(getScopeLabel(5)).toBe("Quick Pass");
    expect(getScopeLabel(10)).toBe("Quick Pass");
  });

  it("should return 'Half Day' for <= 15 minutes", () => {
    expect(getScopeLabel(11)).toBe("Half Day");
    expect(getScopeLabel(15)).toBe("Half Day");
  });

  it("should return 'Most of a Day' for <= 20 minutes", () => {
    expect(getScopeLabel(16)).toBe("Most of a Day");
    expect(getScopeLabel(20)).toBe("Most of a Day");
  });

  it("should return 'Full Day' for <= 30 minutes", () => {
    expect(getScopeLabel(21)).toBe("Full Day");
    expect(getScopeLabel(30)).toBe("Full Day");
  });

  it("should return 'Deep Dive' for <= 45 minutes", () => {
    expect(getScopeLabel(31)).toBe("Deep Dive");
    expect(getScopeLabel(45)).toBe("Deep Dive");
  });

  it("should return 'Sprint' for > 45 minutes", () => {
    expect(getScopeLabel(46)).toBe("Sprint");
    expect(getScopeLabel(60)).toBe("Sprint");
    expect(getScopeLabel(120)).toBe("Sprint");
  });

  it("should handle boundary values correctly", () => {
    // Exactly at boundary: 10 -> Quick Pass, 11 -> Half Day
    expect(getScopeLabel(10)).toBe("Quick Pass");
    expect(getScopeLabel(11)).toBe("Half Day");
    expect(getScopeLabel(15)).toBe("Half Day");
    expect(getScopeLabel(16)).toBe("Most of a Day");
    expect(getScopeLabel(20)).toBe("Most of a Day");
    expect(getScopeLabel(21)).toBe("Full Day");
    expect(getScopeLabel(30)).toBe("Full Day");
    expect(getScopeLabel(31)).toBe("Deep Dive");
    expect(getScopeLabel(45)).toBe("Deep Dive");
    expect(getScopeLabel(46)).toBe("Sprint");
  });
});

describe("missionTimeToDevHours", () => {
  it("should convert agent minutes to developer hours using 16x multiplier", () => {
    // Math.round(15 * 16 / 60) = Math.round(4) = 4
    expect(missionTimeToDevHours(15)).toBe(4);
  });

  it("should handle 1 minute", () => {
    // Math.round(1 * 16 / 60) = Math.round(0.267) = 0
    expect(missionTimeToDevHours(1)).toBe(0);
  });

  it("should handle 60 minutes (1 hour agent time)", () => {
    // Math.round(60 * 16 / 60) = Math.round(16) = 16
    expect(missionTimeToDevHours(60)).toBe(16);
  });

  it("should handle 120 minutes (max mission time)", () => {
    // Math.round(120 * 16 / 60) = Math.round(32) = 32
    expect(missionTimeToDevHours(120)).toBe(32);
  });

  it("should handle 5 minutes (min mission time)", () => {
    // Math.round(5 * 16 / 60) = Math.round(1.333) = 1
    expect(missionTimeToDevHours(5)).toBe(1);
  });

  it("should round to nearest integer", () => {
    // Math.round(7 * 16 / 60) = Math.round(1.867) = 2
    expect(missionTimeToDevHours(7)).toBe(2);
    // Math.round(10 * 16 / 60) = Math.round(2.667) = 3
    expect(missionTimeToDevHours(10)).toBe(3);
  });
});

describe("buildGoalsSection", () => {
  it("should format goals as a numbered checklist", () => {
    const section = buildGoalsSection(["Goal A", "Goal B", "Goal C"]);
    expect(section).toContain("1. [ ] Goal A");
    expect(section).toContain("2. [ ] Goal B");
    expect(section).toContain("3. [ ] Goal C");
  });

  it("should start with '## Goals (complete each in order)'", () => {
    const section = buildGoalsSection(["Goal A"]);
    expect(section).toMatch(/^## Goals \(complete each in order\)/);
  });

  it("should include GOAL_DONE instruction", () => {
    const section = buildGoalsSection(["Goal A"]);
    expect(section).toContain("GOAL_DONE:");
  });

  it("should handle single goal", () => {
    const section = buildGoalsSection(["Only one goal"]);
    expect(section).toContain("1. [ ] Only one goal");
    expect(section).not.toContain("2.");
  });

  it("should handle empty goals array", () => {
    const section = buildGoalsSection([]);
    expect(section).toContain("## Goals (complete each in order)");
    expect(section).toContain("GOAL_DONE:");
  });

  it("should preserve goal text exactly", () => {
    const goals = [
      "Reproduce the issue",
      "Diagnose root cause",
      "Implement fix with regression test",
    ];
    const section = buildGoalsSection(goals);
    for (const goal of goals) {
      expect(section).toContain(goal);
    }
  });
});

describe("buildMissionPrompt", () => {
  const baseMission = {
    prompt: "Do something useful",
    goals: ["Goal 1", "Goal 2"],
    missionTimeMinutes: 15,
    timeoutMinutes: 10,
  };

  it("should include MISSION SCOPE section", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("## MISSION SCOPE");
  });

  it("should include scope label and time info", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("Half Day");
    expect(result).toContain("15 min agent time");
    expect(result).toContain("4 developer hours");
  });

  it("should include SAFETY LIMITS section", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("## SAFETY LIMITS");
  });

  it("should include inactivity timeout", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("Inactivity timeout: 10 minutes");
  });

  it("should include Goals section when goals are present", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("## Goals (complete each in order)");
    expect(result).toContain("1. [ ] Goal 1");
    expect(result).toContain("2. [ ] Goal 2");
  });

  it("should NOT include Goals section when goals are empty", () => {
    const result = buildMissionPrompt({
      ...baseMission,
      goals: [],
    });
    expect(result).not.toContain("## Goals (complete each in order)");
  });

  it("should append the original prompt at the end", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("Do something useful");
    // The user prompt should be at the very end
    expect(result.endsWith("Do something useful")).toBe(true);
  });

  it("should separate goals from scope with ---", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).toContain("---");
    const dashIndex = result.indexOf("---");
    const scopeIndex = result.indexOf("## MISSION SCOPE");
    expect(dashIndex).toBeLessThan(scopeIndex);
  });

  it("should NOT contain TIME BUDGET text", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).not.toContain("TIME BUDGET");
    expect(result).not.toContain("Time Budget");
    expect(result).not.toContain("time budget");
  });

  it("should NOT contain DELEGATION RULES text", () => {
    const result = buildMissionPrompt(baseMission);
    expect(result).not.toContain("DELEGATION RULES");
    expect(result).not.toContain("Delegation Rules");
    expect(result).not.toContain("delegation rules");
  });

  it("should work with different scope labels", () => {
    // Quick Pass (5 min)
    const quick = buildMissionPrompt({ ...baseMission, missionTimeMinutes: 5 });
    expect(quick).toContain("Quick Pass");

    // Sprint (60 min)
    const sprint = buildMissionPrompt({ ...baseMission, missionTimeMinutes: 60 });
    expect(sprint).toContain("Sprint");
  });

  it("should work with different timeout values", () => {
    const result = buildMissionPrompt({
      ...baseMission,
      timeoutMinutes: 30,
    });
    expect(result).toContain("Inactivity timeout: 30 minutes");
  });

  it("should build complete prompt structure in correct order", () => {
    const result = buildMissionPrompt(baseMission);
    const goalsIdx = result.indexOf("## Goals");
    const dashIdx = result.indexOf("---");
    const scopeIdx = result.indexOf("## MISSION SCOPE");
    const safetyIdx = result.indexOf("## SAFETY LIMITS");
    const promptIdx = result.indexOf("Do something useful");

    // Order: Goals -> --- -> Scope -> Safety -> User Prompt
    expect(goalsIdx).toBeLessThan(dashIdx);
    expect(dashIdx).toBeLessThan(scopeIdx);
    expect(scopeIdx).toBeLessThan(safetyIdx);
    expect(safetyIdx).toBeLessThan(promptIdx);
  });
});
