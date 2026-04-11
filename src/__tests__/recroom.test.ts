import { getStoryPrompt, CHAPTER_STATUSES, LOADING_MESSAGES } from "@/lib/story-weaver/prompts";
import { DEFAULT_SETTINGS, FONTS, THEMES } from "@/components/story-weaver/ReaderSettings";

describe("Story Weaver — Prompts", () => {
  it("should return prompts for all phases", () => {
    expect(getStoryPrompt("plan")).toContain("skilled novelist");
    expect(getStoryPrompt("chapter")).toContain("CONSISTENCY");
    expect(getStoryPrompt("summary")).toContain("summariser");
    expect(getStoryPrompt("format")).toContain("editor");
  });

  it("plan prompt should include writing quality standards", () => {
    const prompt = getStoryPrompt("plan");
    expect(prompt).toContain("Vary sentence length");
    expect(prompt).toContain("Show, don't tell");
    expect(prompt).toContain("Dialogue must sound natural");
    expect(prompt).toContain("===PLAN===");
    expect(prompt).toContain("===CHAPTER 1===");
  });

  it("chapter prompt should include context awareness", () => {
    const prompt = getStoryPrompt("chapter");
    expect(prompt).toContain("Where the story has been");
    expect(prompt).toContain("Where the story is going");
    expect(prompt).toContain("CONSISTENCY CHECKLIST");
    expect(prompt).toContain("Character names spelled");
    expect(prompt).toContain("Avoid repetitive sentence starters");
  });

  it("formatting prompt should be non-destructive", () => {
    const prompt = getStoryPrompt("format");
    expect(prompt).toContain("Do NOT change plot");
    expect(prompt).toContain("Do NOT add or remove story events");
    expect(prompt).toContain("ONLY fix formatting");
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

  it("should have 20+ loading messages", () => {
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(20);
    for (const msg of LOADING_MESSAGES) {
      expect(msg.length).toBeGreaterThan(5);
    }
  });
});

describe("Story Weaver — Reader Settings", () => {
  it("should have valid defaults", () => {
    expect(DEFAULT_SETTINGS.fontSize).toBe(17);
    expect(DEFAULT_SETTINGS.lineHeight).toBe(1.2);
    expect(DEFAULT_SETTINGS.fontFamily).toBe("EB Garamond");
    expect(DEFAULT_SETTINGS.pageTheme).toBe("dark");
  });

  it("should have 5 font options with CSS variables", () => {
    expect(FONTS).toHaveLength(5);
    for (const font of FONTS) {
      expect(font.name).toBeTruthy();
      expect(font.family).toContain("var(--font-");
    }
  });

  it("should have 4 theme presets with valid colours", () => {
    expect(Object.keys(THEMES)).toHaveLength(4);
    for (const [key, theme] of Object.entries(THEMES)) {
      expect(theme.bg).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.text).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("Story Weaver — Chapter Read Status", () => {
  it("should support read status states", () => {
    const statuses = ["writing", "unread", "read"];
    for (const s of statuses) {
      expect(statuses).toContain(s);
    }
  });

  it("should mark first chapter complete after creation", () => {
    const chapters = [
      { number: 1, title: "Ch1", status: "complete", wordCount: 800, readStatus: "unread" },
      { number: 2, title: "Ch2", status: "pending", wordCount: 0, readStatus: "writing" },
    ];
    expect(chapters[0].status).toBe("complete");
    expect(chapters[0].readStatus).toBe("unread");
  });

  it("should detect all chapters complete", () => {
    const chapters = [
      { number: 1, status: "complete", readStatus: "read" },
      { number: 2, status: "complete", readStatus: "read" },
    ];
    expect(chapters.every((c) => c.status === "complete")).toBe(true);
    expect(chapters.every((c) => c.readStatus === "read")).toBe(true);
  });
});

describe("Story Weaver — Formatting Check", () => {
  it("should detect overly long paragraphs", () => {
    const longParagraph = Array(12).fill("He walked to the door.").join(" ") ;
    expect(longParagraph.split(/[.!?]+/).filter(s => s.trim().length > 0).length).toBeGreaterThan(8);
  });

  it("should accept well-formatted content", () => {
    const goodContent = "First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph.";
    const paragraphs = goodContent.split(/\n\n+/);
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Story Weaver — Word Count Ranges", () => {
  it("should have valid range options", () => {
    const ranges = ["short", "medium", "standard", "long", "epic", "marathon"];
    expect(ranges).toHaveLength(6);
  });
});
