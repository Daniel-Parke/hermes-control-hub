import {
  titleCase,
  timeAgo,
  timeUntil,
  formatBytes,
  truncate,
  messageSummary,
} from "@/lib/utils";

describe("titleCase", () => {
  it("capitalises first letter", () => {
    expect(titleCase("running")).toBe("Running");
  });

  it("returns empty string unchanged", () => {
    expect(titleCase("")).toBe("");
  });

  it("returns single char capitalised", () => {
    expect(titleCase("a")).toBe("A");
  });

  it("preserves rest of string", () => {
    expect(titleCase("hello world")).toBe("Hello world");
  });

  it("handles null-ish as empty", () => {
    expect(titleCase(null as unknown as string)).toBeNull();
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for very recent timestamps", () => {
    expect(timeAgo(new Date().toISOString())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("returns 'never' for null", () => {
    expect(timeAgo(null)).toBe("never");
  });
});

describe("timeUntil", () => {
  it("returns '—' for null", () => {
    expect(timeUntil(null)).toBe("—");
  });

  it("returns 'overdue' for past timestamps", () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(timeUntil(past)).toBe("overdue");
  });

  it("returns '< 1m' for imminent timestamps", () => {
    const soon = new Date(Date.now() + 30000).toISOString();
    expect(timeUntil(soon)).toBe("< 1m");
  });

  it("returns minutes for short durations", () => {
    const tenMin = new Date(Date.now() + 10 * 60000).toISOString();
    expect(timeUntil(tenMin)).toBe("10m");
  });

  it("returns hours and minutes for long durations", () => {
    const ninetyMin = new Date(Date.now() + 90 * 60000).toISOString();
    expect(timeUntil(ninetyMin)).toBe("1h 30m");
  });
});

describe("formatBytes", () => {
  it("returns '0 B' for zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });
});

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with ellipsis", () => {
    expect(truncate("hello world", 6)).toBe("hello…");
  });

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("messageSummary", () => {
  it("returns '(no content)' for undefined", () => {
    expect(messageSummary(undefined)).toBe("(no content)");
  });

  it("returns first line of content", () => {
    expect(messageSummary("Hello")).toBe("Hello");
  });

  it("adds ellipsis for multi-line content", () => {
    expect(messageSummary("Line 1\nLine 2")).toBe("Line 1...");
  });

  it("truncates long single lines to 120 chars", () => {
    const long = "a".repeat(150);
    const result = messageSummary(long);
    expect(result.length).toBeLessThanOrEqual(123); // 120 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("skips empty lines", () => {
    expect(messageSummary("\n\nFirst content\nMore")).toBe("First content...");
  });
});
