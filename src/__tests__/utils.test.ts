import { getMissionProgressSteps, messageSummary, validateSessionCompletion, parseSchedule, titleCase, SessionMessage } from "@/lib/utils";

describe("getMissionProgressSteps", () => {
  describe("labels", () => {
    it("should use 'Queued' for cron dispatch mode", () => {
      const steps = getMissionProgressSteps("scheduled", "cron");
      expect(steps[0].label).toBe("Queued");
    });

    it("should use 'Dispatched' for one-shot dispatch mode", () => {
      const steps = getMissionProgressSteps("dispatched", "now");
      expect(steps[0].label).toBe("Dispatched");
    });

    it("should use 'Dispatched' when no dispatch mode specified", () => {
      const steps = getMissionProgressSteps("dispatched");
      expect(steps[0].label).toBe("Dispatched");
    });

    it("should always use 'Processing' for step 2 (not 'Working')", () => {
      const steps = getMissionProgressSteps("running", "now");
      expect(steps[1].label).toBe("Processing");
    });

    it("should always use 'Done' for step 3", () => {
      const steps = getMissionProgressSteps("completed", "now");
      expect(steps[2].label).toBe("Done");
    });
  });

  describe("states — completed", () => {
    it("should mark all steps as done when completed", () => {
      const steps = getMissionProgressSteps("completed", "now");
      expect(steps.every((s) => s.state === "done")).toBe(true);
    });
  });

  describe("states — failed", () => {
    it("should mark step 1 done, steps 2-3 failed", () => {
      const steps = getMissionProgressSteps("failed", "now");
      expect(steps[0].state).toBe("done");
      expect(steps[1].state).toBe("failed");
      expect(steps[2].state).toBe("failed");
    });
  });

  describe("states — running", () => {
    it("should mark step 1 done, step 2 active, step 3 pending", () => {
      const steps = getMissionProgressSteps("running", "now");
      expect(steps[0].state).toBe("done");
      expect(steps[1].state).toBe("active");
      expect(steps[2].state).toBe("pending");
    });

    it("should mark as active when cron state is 'active'", () => {
      const steps = getMissionProgressSteps("dispatched", "cron", "active");
      expect(steps[0].state).toBe("done");
      expect(steps[1].state).toBe("active");
    });

    it("should mark as active when cron state is 'running'", () => {
      const steps = getMissionProgressSteps("dispatched", "cron", "running");
      expect(steps[0].state).toBe("done");
      expect(steps[1].state).toBe("active");
    });
  });

  describe("states — queued/dispatched", () => {
    it("should mark only step 1 as active when dispatched but not running", () => {
      const steps = getMissionProgressSteps("dispatched", "now");
      expect(steps[0].state).toBe("active");
      expect(steps[1].state).toBe("pending");
      expect(steps[2].state).toBe("pending");
    });

    it("should mark only step 1 as active when scheduled (cron)", () => {
      const steps = getMissionProgressSteps("scheduled", "cron");
      expect(steps[0].state).toBe("active");
      expect(steps[1].state).toBe("pending");
    });
  });

  describe("step count", () => {
    it("should always return exactly 3 steps", () => {
      const steps = getMissionProgressSteps("completed", "now");
      expect(steps).toHaveLength(3);
    });
  });
});

describe("messageSummary", () => {
  it("should return '(no content)' for undefined", () => {
    expect(messageSummary(undefined)).toBe("(no content)");
  });

  it("should return '(no content)' for empty string", () => {
    expect(messageSummary("")).toBe("(no content)");
  });

  it("should return the first line for single-line content", () => {
    expect(messageSummary("Hello world")).toBe("Hello world");
  });

  it("should truncate long first lines to 120 chars", () => {
    const longLine = "a".repeat(200);
    const summary = messageSummary(longLine);
    expect(summary.length).toBeLessThanOrEqual(123); // 120 + "..."
    expect(summary).toMatch(/\.\.\.$/);
  });

  it("should add ellipsis for multi-line content", () => {
    const summary = messageSummary("First line\nSecond line\nThird line");
    expect(summary).toBe("First line...");
  });

  it("should skip blank lines and use first non-empty line", () => {
    const summary = messageSummary("\n\n  \nActual content here");
    expect(summary).toBe("Actual content here");
  });

  it("should add ellipsis when first line is exactly 120 chars but content has more lines", () => {
    const line = "x".repeat(120);
    const summary = messageSummary(line + "\nmore");
    expect(summary).toBe(line + "...");
  });

  it("should NOT add ellipsis for single-line content under 120 chars", () => {
    const summary = messageSummary("Short message");
    expect(summary).toBe("Short message");
    expect(summary).not.toMatch(/\.\.\.$/);
  });
});

describe("validateSessionCompletion", () => {
  describe("empty sessions", () => {
    it("should mark empty session as not completed", () => {
      const result = validateSessionCompletion([]);
      expect(result.completed).toBe(false);
      expect(result.reason).toContain("empty session");
    });
  });

  describe("interrupted sessions (last message is tool)", () => {
    it("should detect interrupted session when last message is a tool result", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Do a code review" },
        { role: "assistant", content: "Let me review the code", tool_calls: [{ function: { name: "read_file" } }] },
        { role: "tool", content: "File contents here..." },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.reason).toContain("interrupted");
      expect(result.lastMessageRole).toBe("tool");
    });

    it("should handle the actual Code Review timeout scenario", () => {
      // Simulates the real scenario: delegate_task results came back but agent never responded
      const messages: SessionMessage[] = [
        { role: "user", content: "Code review prompt..." },
        { role: "assistant", content: "Starting review", tool_calls: [{ function: { name: "delegate_task" } }] },
        { role: "tool", content: JSON.stringify({ results: [{ status: "completed", summary: "Found bugs" }] }) },
        { role: "assistant", content: "Now let me do detailed review", tool_calls: [{ function: { name: "delegate_task" } }] },
        { role: "tool", content: JSON.stringify({ results: [{ status: "interrupted", summary: "Operation interrupted" }] }) },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.reason).toContain("interrupted");
    });
  });

  describe("completed sessions", () => {
    it("should detect completed session with meaningful assistant response", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Review this code" },
        { role: "assistant", content: "I found 3 issues:\n1. Bug in auth\n2. Missing error handling\n3. SQL injection risk\n\nHere's my detailed analysis..." },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(true);
      expect(result.hasFinalReport).toBe(true);
    });

    it("should detect completed session with GOAL_DONE markers", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Fix this bug" },
        { role: "assistant", content: "GOAL_DONE: Reproduced the issue\nGOAL_DONE: Found root cause\nFixed the bug in auth.ts" },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(true);
      expect(result.hasFinalReport).toBe(true);
    });

    it("should detect [SILENT] completion", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Check for issues" },
        { role: "assistant", content: "[SILENT]" },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(true);
      expect(result.hasFinalReport).toBe(false);
      expect(result.reason).toContain("SILENT");
    });

    it("should handle assistant response after tool results", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Review code" },
        { role: "assistant", content: "Let me check", tool_calls: [{ function: { name: "read_file" } }] },
        { role: "tool", content: "File contents..." },
        { role: "assistant", content: "After reviewing the code, I found several issues that need addressing. The main concerns are..." },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(true);
      expect(result.hasFinalReport).toBe(true);
    });
  });

  describe("incomplete sessions", () => {
    it("should detect too-short assistant response as incomplete", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Review code" },
        { role: "assistant", content: "OK" },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(false);
      expect(result.reason).toContain("too short");
    });

    it("should detect assistant with tool_calls as potentially interrupted", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Review code" },
        { role: "assistant", content: "Let me read the files first", tool_calls: [{ function: { name: "read_file" } }] },
        { role: "tool", content: "file data..." },
        { role: "assistant", content: "Now checking more files", finish_reason: "tool_calls", tool_calls: [{ function: { name: "read_file" } }] },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle session with only user message", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Hello" },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(false);
    });

    it("should handle system message as last", () => {
      const messages: SessionMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there, how can I help you today with this project?" },
        { role: "system", content: "Session ended" },
      ];
      const result = validateSessionCompletion(messages);
      expect(result.completed).toBe(false);
      expect(result.reason).toContain("unexpected");
    });
  });
});

describe("titleCase", () => {
  it("should capitalise the first letter of a string", () => {
    expect(titleCase("running")).toBe("Running");
    expect(titleCase("completed")).toBe("Completed");
    expect(titleCase("queued")).toBe("Queued");
  });

  it("should return empty string unchanged", () => {
    expect(titleCase("")).toBe("");
  });

  it("should handle single character strings", () => {
    expect(titleCase("a")).toBe("A");
    expect(titleCase("Z")).toBe("Z");
  });

  it("should not change already capitalised strings", () => {
    expect(titleCase("Running")).toBe("Running");
    expect(titleCase("OK")).toBe("OK");
  });

  it("should handle status values from cron jobs", () => {
    expect(titleCase("scheduled")).toBe("Scheduled");
    expect(titleCase("paused")).toBe("Paused");
    expect(titleCase("failed")).toBe("Failed");
    expect(titleCase("ok")).toBe("Ok");
  });

  it("should handle special status values", () => {
    expect(titleCase("active")).toBe("Active");
    expect(titleCase("idle")).toBe("Idle");
    expect(titleCase("disabled")).toBe("Disabled");
    expect(titleCase("connected")).toBe("Connected");
  });
});

describe("getMissionProgressSteps — edge cases", () => {
  it("should show 'Dispatched' state for recurring job between runs", () => {
    // Recurring job that completed, now waiting for next run
    const steps = getMissionProgressSteps("dispatched", "cron");
    expect(steps[0].state).toBe("active");
    expect(steps[1].state).toBe("pending");
    expect(steps[2].state).toBe("pending");
  });

  it("should show 'Running' state with correct progress", () => {
    const steps = getMissionProgressSteps("running", "now");
    expect(steps[0].label).toBe("Dispatched");
    expect(steps[0].state).toBe("done");
    expect(steps[1].label).toBe("Processing");
    expect(steps[1].state).toBe("active");
    expect(steps[2].label).toBe("Done");
    expect(steps[2].state).toBe("pending");
  });

  it("should handle completed state with all steps done", () => {
    const steps = getMissionProgressSteps("completed", "cron");
    expect(steps[0].label).toBe("Queued");
    expect(steps[0].state).toBe("done");
    expect(steps[1].state).toBe("done");
    expect(steps[2].state).toBe("done");
  });

  it("should handle failed state correctly", () => {
    const steps = getMissionProgressSteps("failed", "now");
    expect(steps[0].state).toBe("done");
    expect(steps[1].state).toBe("failed");
    expect(steps[2].state).toBe("failed");
  });

  it("should not crash with unknown status values", () => {
    const steps = getMissionProgressSteps("unknown-status");
    expect(steps).toHaveLength(3);
    expect(steps[0].state).toBe("active");
  });
});
