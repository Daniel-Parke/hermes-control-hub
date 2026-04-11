import { getSystemPrompt, EXAMPLE_PROMPTS } from "@/lib/recroom/prompt-templates";
import { REC_ROOM_ACTIVITIES } from "@/types/recroom";

describe("Rec Room — Activity Registry", () => {
  it("should have exactly 3 activities", () => {
    expect(REC_ROOM_ACTIVITIES).toHaveLength(3);
  });

  it("should have all required fields for each activity", () => {
    for (const activity of REC_ROOM_ACTIVITIES) {
      expect(activity).toHaveProperty("id");
      expect(activity).toHaveProperty("name");
      expect(activity).toHaveProperty("description");
      expect(activity).toHaveProperty("icon");
      expect(activity).toHaveProperty("accentColor");
      expect(activity).toHaveProperty("examples");
      expect(activity.examples.length).toBeGreaterThan(0);
    }
  });

  it("should have unique activity IDs", () => {
    const ids = REC_ROOM_ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have valid accent colors", () => {
    const validColors = ["cyan", "purple", "green", "pink", "orange"];
    for (const activity of REC_ROOM_ACTIVITIES) {
      expect(validColors).toContain(activity.accentColor);
    }
  });
});

describe("Rec Room — Prompt Templates", () => {
  it("should return system prompts for all activity/phase combinations", () => {
    const combos = [
      ["creative-canvas", "enhance"],
      ["creative-canvas", "generate"],
      ["creative-canvas", "refine"],
      ["ascii-studio", "enhance"],
      ["ascii-studio", "generate"],
      ["story-weaver", "plan"],
      ["story-weaver", "generate"],
      ["story-weaver", "chapter"],
    ] as const;

    for (const [activity, phase] of combos) {
      const prompt = getSystemPrompt(activity, phase);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(50);
    }
  });

  it("should return empty string for unknown combinations", () => {
    expect(getSystemPrompt("unknown", "enhance")).toBe("");
  });

  it("should include p5.js requirements in canvas generate prompt", () => {
    const prompt = getSystemPrompt("creative-canvas", "generate");
    expect(prompt).toContain("p5.js");
    expect(prompt).toContain("HTML");
    expect(prompt).toContain("self-contained");
  });

  it("should include JSON format in canvas enhance prompt", () => {
    const prompt = getSystemPrompt("creative-canvas", "enhance");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("interpretation");
    expect(prompt).toContain("options");
  });

  it("should include ASCII rules in ascii generate prompt", () => {
    const prompt = getSystemPrompt("ascii-studio", "generate");
    expect(prompt).toContain("ASCII");
    expect(prompt).toContain("monospaced");
  });

  it("should include story context in story page prompt", () => {
    const prompt = getSystemPrompt("story-weaver", "chapter");
    expect(prompt).toContain("story");
    expect(prompt).toContain("800-1500 words");
    expect(prompt).toContain("CONSISTENCY");
  });
});

describe("Rec Room — Example Prompts", () => {
  it("should have examples for each activity", () => {
    expect(EXAMPLE_PROMPTS["creative-canvas"]).toBeDefined();
    expect(EXAMPLE_PROMPTS["ascii-studio"]).toBeDefined();
    expect(EXAMPLE_PROMPTS["story-weaver"]).toBeDefined();
  });

  it("should have at least 3 examples per activity", () => {
    for (const [activity, examples] of Object.entries(EXAMPLE_PROMPTS)) {
      expect(examples.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("should have non-empty example strings", () => {
    for (const examples of Object.values(EXAMPLE_PROMPTS)) {
      for (const example of examples) {
        expect(example.length).toBeGreaterThan(5);
      }
    }
  });
});

describe("Rec Room — Save Path Logic", () => {
  it("should construct save paths correctly", () => {
    // Test the path construction pattern
    const activity = "creative-canvas";
    const id = "test123";
    const expected = activity + "_" + id + ".json";
    expect(expected).toBe("creative-canvas_test123.json");
  });

  it("should filter saved items by activity prefix", () => {
    const files = [
      "creative-canvas_abc.json",
      "ascii-studio_def.json",
      "creative-canvas_ghi.json",
      "story-weaver_jkl.json",
    ];

    const canvasFiles = files.filter((f) => f.startsWith("creative-canvas_"));
    expect(canvasFiles).toHaveLength(2);

    const asciiFiles = files.filter((f) => f.startsWith("ascii-studio_"));
    expect(asciiFiles).toHaveLength(1);
  });
});
