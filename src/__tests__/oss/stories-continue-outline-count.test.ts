/** @jest-environment node */

// Regression test: /api/stories continue action must truncate outlines to requested count
// Bug: if LLM generated MORE outlines than requested, all were appended instead of just addCount

jest.mock("fs", () => {
  const mockStory = {
    id: "story_test123",
    title: "Test Story",
    status: "complete",
    chapters: [
      { number: 1, title: "Chapter 1", status: "complete", wordCount: 1000, generatedAt: "2025-01-01" },
    ],
    chapterContents: { "1": "Chapter 1 content" },
    storyArc: {
      storyArc: "A test story",
      chapterOutlines: [
        { number: 1, title: "Chapter 1", purpose: "Introduction", keyBeats: ["Start"], emotionalTone: "Engaging" },
      ],
      fixedPlotPoints: [],
      characterArcs: [],
      worldRules: [],
      themes: [],
    },
    rollingSummary: "Chapter 1 summary",
    masterPrompt: "Write a story",
    config: { length: "medium", premise: "A test" },
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  };

  return {
    existsSync: jest.fn((path: string) => {
      if (path.includes("story_test123")) return true;
      return false;
    }),
    readFileSync: jest.fn(() => JSON.stringify(mockStory)),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    unlinkSync: jest.fn(),
  };
});

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: {
    stories: "/tmp/test-hermes/stories",
  },
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

// Mock callLLM to return MORE outlines than requested (5 instead of 3)
const mockOutlines = [
  { number: 2, title: "Chapter 2", purpose: "Development A", keyBeats: ["Event A"], emotionalTone: "Tense" },
  { number: 3, title: "Chapter 3", purpose: "Development B", keyBeats: ["Event B"], emotionalTone: "Dramatic" },
  { number: 4, title: "Chapter 4", purpose: "Development C", keyBeats: ["Event C"], emotionalTone: "Climactic" },
  { number: 5, title: "Chapter 5", purpose: "Development D", keyBeats: ["Event D"], emotionalTone: "Falling" },
  { number: 6, title: "Chapter 6", purpose: "Resolution", keyBeats: ["Event E"], emotionalTone: "Satisfying" },
];

jest.mock("@/lib/story-weaver/prompts", () => ({
  getStoryPrompt: jest.fn(() => "system prompt"),
}));

// We need to mock the fetch call inside callLLM
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      choices: [{ message: { content: JSON.stringify(mockOutlines) } }],
    }),
  })
) as jest.Mock;

import { NextRequest } from "next/server";

describe("/api/stories continue outline count validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CH_READ_ONLY;
  });

  it("truncates outlines when LLM returns more than requested count", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const request = new NextRequest("http://localhost/api/stories", {
      method: "POST",
      body: JSON.stringify({
        action: "continue",
        storyId: "story_test123",
        direction: "Continue the adventure",
        count: 3, // Request 3 chapters
      }),
    });

    const res = await POST(request);
    const data = await res.json();

    // Should succeed
    expect(res.status).toBe(200);
    expect(data.data).toBeDefined();

    // Verify only 3 new chapters were added (not 5)
    const fs = jest.requireMock("fs") as { writeFileSync: jest.Mock };
    expect(fs.writeFileSync).toHaveBeenCalled();

    const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    // Original had 1 chapter, should now have 1 + 3 = 4 (not 1 + 5 = 6)
    expect(writtenData.chapters.length).toBe(4);
    expect(writtenData.storyArc.chapterOutlines.length).toBe(4);
  });
});
