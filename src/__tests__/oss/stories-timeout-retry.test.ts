/** @jest-environment node */

// Regression test: callLLM in stories route must retry on timeout (AbortError)
// Bug: AbortError handler threw immediately without checking remaining retries.
// All other errors (network, 429, empty response) retried, but timeouts didn't.

// We test the retry behavior by mocking fetch to abort on first call, succeed on second.

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => "{}"),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  unlinkSync: jest.fn(),
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: { stories: "/tmp/test-hermes/stories" },
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

jest.mock("@/lib/story-weaver/prompts", () => ({
  getStoryPrompt: jest.fn(() => "system prompt"),
}));

jest.mock("@/lib/api-auth", () => ({
  requireMcApiKey: jest.fn(() => null),
  requireNotReadOnly: jest.fn(() => null),
}));

describe("callLLM timeout retry", () => {
  let fetchCallCount: number;

  beforeEach(() => {
    fetchCallCount = 0;
    jest.resetModules();
  });

  it("retries on AbortError (timeout) instead of failing immediately", async () => {
    // Mock fetch: first call aborts, second call succeeds
    const mockFetch = jest.fn(async (_url: string, init?: RequestInit) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Simulate timeout: trigger abort signal, then throw AbortError
        if (init?.signal) {
          const signal = init.signal as AbortSignal;
          // Immediately abort
          (signal as unknown as { aborted: boolean }).aborted = true;
        }
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      }
      // Second call succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Successfully generated content after retry." } }],
        }),
      };
    });

    // Replace global fetch
    const originalFetch = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    try {
      // Import after mocking
      const { POST } = await import("@/app/api/stories/route");
      const { NextRequest } = await import("next/server");

      // Mock fs for this specific test
      const fs = await import("fs");
      (fs.readdirSync as jest.Mock).mockReturnValue(["test-story.json"]);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          id: "test-story",
          title: "Test Story",
          masterPrompt: "A test story",
          storyArc: {
            storyArc: "Test arc",
            fixedPlotPoints: [],
            characterArcs: [],
            worldRules: [],
            themes: [],
            chapterOutlines: [
              { number: 1, title: "Chapter 1", purpose: "Introduction", keyBeats: ["Start"], emotionalTone: "Engaging" },
            ],
          },
          rollingSummary: "",
          chapters: [{ number: 1, title: "Chapter 1", status: "pending", wordCount: 0, generatedAt: null }],
          chapterContents: {},
          config: { premise: "Test" },
          status: "active",
        })
      );

      const request = new NextRequest("http://localhost/api/stories", {
        method: "POST",
        body: JSON.stringify({ action: "generate-chapter", storyId: "test-story" }),
      });

      const res = await POST(request);
      const data = await res.json();

      // The callLLM should have been called at least twice:
      // - First call aborted (timeout), then retried and succeeded
      // - Additional calls for rolling summary, etc.
      // The key assertion: it retried instead of failing immediately
      expect(fetchCallCount).toBeGreaterThanOrEqual(2);
      // The request should succeed (not fail with timeout)
      expect(res.status).toBe(200);
      expect(data.data?.chapter).toBe(1);
    } finally {
      global.fetch = originalFetch;
    }
  }, 30_000); // Extended timeout since retries add delay
});
