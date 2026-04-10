import { getMissionProgressSteps, messageSummary, ProgressStep } from "@/lib/utils";

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
