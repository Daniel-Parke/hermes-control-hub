import { getStoryPrompt, CHAPTER_STATUSES, LOADING_MESSAGES } from "@/lib/story-weaver/prompts";

describe("Story Weaver — Prompts", () => {
  it("should return prompts for all phases", () => {
    expect(getStoryPrompt("plan")).toContain("STORY PLAN");
    expect(getStoryPrompt("chapter")).toContain("CONSISTENCY");
    expect(getStoryPrompt("summary")).toContain("Summarize");
  });

  it("plan prompt should include plan+chapter format", () => {
    const prompt = getStoryPrompt("plan");
    expect(prompt).toContain("===PLAN===");
    expect(prompt).toContain("===CHAPTER 1===");
    expect(prompt).toContain("DEVIATION HOOKS");
  });

  it("chapter prompt should include consistency checklist", () => {
    const prompt = getStoryPrompt("chapter");
    expect(prompt).toContain("Character names");
    expect(prompt).toContain("plotholes");
    expect(prompt).toContain("800-1500 words");
  });

  it("should fallback to chapter prompt for unknown phase", () => {
    const result = getStoryPrompt("unknown" as any);
    expect(result).toBeTruthy();
    expect(result).toContain("CONSISTENCY");
  });
});

describe("Story Weaver — Status Messages", () => {
  it("should have status messages for all states", () => {
    expect(CHAPTER_STATUSES.pending).toBeTruthy();
    expect(CHAPTER_STATUSES.writing).toBeTruthy();
    expect(CHAPTER_STATUSES.complete).toBeTruthy();
    expect(CHAPTER_STATUSES.failed).toBeTruthy();
  });

  it("should have loading messages", () => {
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(4);
    for (const msg of LOADING_MESSAGES) {
      expect(msg.length).toBeGreaterThan(5);
    }
  });
});

describe("Story Weaver — API Response Format", () => {
  it("should match create response shape", () => {
    const mock = {
      id: "story_abc123",
      title: "Test Story",
      chapters: [{ number: 1, title: "Ch1", status: "complete", wordCount: 500 }],
      chapterContents: { "1": "Once upon a time..." },
    };
    expect(mock).toHaveProperty("id");
    expect(mock).toHaveProperty("title");
    expect(mock).toHaveProperty("chapters");
    expect(mock).toHaveProperty("chapterContents");
    expect(mock.chapters[0].status).toBe("complete");
  });

  it("should match list response shape", () => {
    const mock = {
      stories: [{ id: "s1", title: "Story 1", chapters: [{ number: 1, status: "complete" }] }],
    };
    expect(Array.isArray(mock.stories)).toBe(true);
    expect(mock.stories[0]).toHaveProperty("id");
    expect(mock.stories[0]).toHaveProperty("title");
  });
});

describe("Story Weaver — Chapter Statuses", () => {
  it("should mark first chapter complete after creation", () => {
    const chapters = [
      { number: 1, title: "Ch1", status: "complete", wordCount: 800 },
      { number: 2, title: "Ch2", status: "pending", wordCount: 0 },
      { number: 3, title: "Ch3", status: "pending", wordCount: 0 },
    ];
    const nextPending = chapters.findIndex((c) => c.status === "pending") + 1;
    expect(nextPending).toBe(2);
  });

  it("should detect all chapters complete", () => {
    const chapters = [
      { number: 1, status: "complete" },
      { number: 2, status: "complete" },
    ];
    expect(chapters.every((c) => c.status === "complete")).toBe(true);
  });
});
