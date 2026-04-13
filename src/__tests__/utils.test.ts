import { messageSummary, parseSchedule, titleCase } from "@/lib/utils";

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

describe("titleCase", () => {
  it("should capitalise the first letter of a string", () => {
    expect(titleCase("running")).toBe("Running");
    expect(titleCase("successful")).toBe("Successful");
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

  it("should handle mission status values", () => {
    expect(titleCase("queued")).toBe("Queued");
    expect(titleCase("dispatched")).toBe("Dispatched");
    expect(titleCase("successful")).toBe("Successful");
    expect(titleCase("failed")).toBe("Failed");
  });
});

describe("parseSchedule", () => {
  it("should parse 'every 15m' interval", () => {
    const result = parseSchedule("every 15m");
    expect(result).toMatchObject({
      kind: "interval",
      minutes: 15,
      display: "every 15m",
    });
  });

  it("should parse 'every 2h' interval", () => {
    const result = parseSchedule("every 2h");
    expect(result).toMatchObject({ kind: "interval", minutes: 120 });
  });

  it("should parse '30m' shorthand", () => {
    const result = parseSchedule("30m");
    expect(result).toMatchObject({ kind: "interval", minutes: 30 });
  });

  it("should parse cron expressions", () => {
    const result = parseSchedule("0 */2 * * *");
    expect(result).toMatchObject({ kind: "cron", expr: "0 */2 * * *" });
  });

  it("should parse ISO timestamps as one-shot", () => {
    const result = parseSchedule("2026-04-09T12:00:00Z");
    expect(result).toMatchObject({
      kind: "once",
      run_at: "2026-04-09T12:00:00Z",
    });
  });

  it("should return invalid for unknown formats", () => {
    const result = parseSchedule("some random string");
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("should accept six-field cron expressions", () => {
    const result = parseSchedule("0 */15 * * * *");
    expect(result.kind).toBe("cron");
    if (result.kind === "cron") {
      expect(result.expr).toContain("*");
    }
  });
});
