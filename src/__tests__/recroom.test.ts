import { getStoryPrompt, STORY_ARC_AND_CHAPTER_PROMPT, CHAPTER_PROMPT, SUMMARY_PROMPT, LOADING_MESSAGES, CHAPTER_STATUSES } from "@/lib/story-weaver/prompts";

describe("Story Weaver — Story Arc Prompts", () => {
  describe("getStoryPrompt", () => {
    it("should return arc+chapter prompt for 'arc' phase", () => {
      expect(getStoryPrompt("arc")).toBe(STORY_ARC_AND_CHAPTER_PROMPT);
    });

    it("should return chapter prompt for 'chapter' phase", () => {
      expect(getStoryPrompt("chapter")).toBe(CHAPTER_PROMPT);
    });

    it("should return summary prompt for 'summary' phase", () => {
      expect(getStoryPrompt("summary")).toBe(SUMMARY_PROMPT);
    });

    it("should fallback to chapter prompt for unknown phase", () => {
      expect(getStoryPrompt("unknown" as any)).toBe(CHAPTER_PROMPT);
    });
  });

  describe("Combined Arc + Chapter Prompt", () => {
    it("should specify ===ARC=== and ===CHAPTER 1=== format", () => {
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("===ARC===");
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("===CHAPTER 1===");
    });

    it("should include arc structure fields", () => {
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("storyArc");
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("fixedPlotPoints");
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("characterArcs");
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("worldRules");
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("chapterOutlines");
    });

    it("should emphasize specificity for plot points", () => {
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("SPECIFIC");
    });

    it("should specify pure prose for chapter output", () => {
      expect(STORY_ARC_AND_CHAPTER_PROMPT).toContain("Pure prose");
    });
  });

  describe("Chapter Prompt", () => {
    it("should reference fixed plot points", () => {
      expect(CHAPTER_PROMPT).toContain("FIXED PLOT POINTS");
      expect(CHAPTER_PROMPT).toContain("contract");
    });

    it("should include quality standards", () => {
      expect(CHAPTER_PROMPT).toContain("Vary sentence length");
      expect(CHAPTER_PROMPT).toContain("Show, don't tell");
    });
  });

  describe("Summary Prompt", () => {
    it("should allow flexible length", () => {
      expect(SUMMARY_PROMPT).toContain("thorough");
      expect(SUMMARY_PROMPT).toContain("5-10 lines");
      expect(SUMMARY_PROMPT).toContain("20-30+");
    });
  });
});

describe("Story Weaver — Status Messages", () => {
  it("should have status messages for all states", () => {
    expect(CHAPTER_STATUSES.pending).toBeTruthy();
    expect(CHAPTER_STATUSES.writing).toBeTruthy();
    expect(CHAPTER_STATUSES.complete).toBeTruthy();
    expect(CHAPTER_STATUSES.failed).toBeTruthy();
  });

  it("should have 30+ loading messages", () => {
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(30);
    for (const msg of LOADING_MESSAGES) {
      expect(msg.length).toBeGreaterThan(5);
    }
  });
});

describe("Story Weaver — Removed Phases", () => {
  it("should not have 'bible' phase (renamed to 'arc')", () => {
    const result = getStoryPrompt("bible" as any);
    expect(result).toBe(CHAPTER_PROMPT); // falls back to chapter
  });

  it("should not have 'plan' phase (replaced by 'arc')", () => {
    const result = getStoryPrompt("plan" as any);
    expect(result).toBe(CHAPTER_PROMPT);
  });

  it("should not have 'format' phase (removed)", () => {
    const result = getStoryPrompt("format" as any);
    expect(result).toBe(CHAPTER_PROMPT);
  });
});
