/**
 * Tests for the formatSchedule display function used in the Cron page.
 * Extracted logic from src/app/cron/page.tsx:formatSchedule
 */

/** Inline copy of the formatSchedule function for testing (avoids importing React component). */
function formatSchedule(schedule: string): string {
  if (!schedule) return "No schedule";
  const parts = schedule.trim().split(/\s+/);
  if (parts.length === 5 || parts.length === 6) {
    const offset = parts.length - 5;
    const [min, hour, dom, mon, dow] = parts.slice(offset);
    if (min === "*" && hour === "*" && dom === "*" && mon === "*" && dow === "*") return "Every minute";
    if (min !== "*" && hour !== "*" && dom === "*" && mon === "*" && dow === "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
    if (min !== "*" && hour !== "*" && dow !== "*" && dom === "*" && mon === "*") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayIndex = parseInt(dow);
      const dayLabel = Number.isFinite(dayIndex) && dayIndex >= 0 && dayIndex <= 6
        ? days[dayIndex]
        : dow;
      return `Every ${dayLabel} at ${hour}:${min.padStart(2, "0")}`;
    }
    // Every N minutes pattern (e.g., */5 * * * *)
    if (min.startsWith("*/") && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
      const n = min.slice(2);
      return `Every ${n} minute${n === "1" ? "" : "s"}`;
    }
  }
  return schedule;
}

describe("formatSchedule", () => {
  it("returns 'No schedule' for empty input", () => {
    expect(formatSchedule("")).toBe("No schedule");
  });

  it("formats every minute cron", () => {
    expect(formatSchedule("* * * * *")).toBe("Every minute");
  });

  it("formats daily schedule", () => {
    expect(formatSchedule("30 9 * * *")).toBe("Daily at 9:30");
    expect(formatSchedule("0 14 * * *")).toBe("Daily at 14:00");
    expect(formatSchedule("5 8 * * *")).toBe("Daily at 8:05");
  });

  it("formats weekly schedule with numeric DOW", () => {
    expect(formatSchedule("0 9 * * 1")).toBe("Every Mon at 9:00");
    expect(formatSchedule("30 14 * * 5")).toBe("Every Fri at 14:30");
    expect(formatSchedule("0 0 * * 0")).toBe("Every Sun at 0:00");
    expect(formatSchedule("0 0 * * 6")).toBe("Every Sat at 0:00");
  });

  it("falls back to raw DOW for non-numeric day-of-week (was NaN bug)", () => {
    expect(formatSchedule("0 9 * * MON-FRI")).toBe("Every MON-FRI at 9:00");
    expect(formatSchedule("0 9 * * MON")).toBe("Every MON at 9:00");
    expect(formatSchedule("0 9 * * TUE,THU")).toBe("Every TUE,THU at 9:00");
  });

  it("handles 6-part cron (with seconds field)", () => {
    expect(formatSchedule("0 30 9 * * *")).toBe("Daily at 9:30");
    expect(formatSchedule("0 0 9 * * 1")).toBe("Every Mon at 9:00");
    expect(formatSchedule("0 0 9 * * MON")).toBe("Every MON at 9:00");
  });

  it("formats every N minutes pattern", () => {
    expect(formatSchedule("*/5 * * * *")).toBe("Every 5 minutes");
    expect(formatSchedule("*/30 * * * *")).toBe("Every 30 minutes");
    expect(formatSchedule("*/1 * * * *")).toBe("Every 1 minute");
  });

  it("returns raw string for unrecognized patterns", () => {
    expect(formatSchedule("0 9 15 * *")).toBe("0 9 15 * *");
    expect(formatSchedule("0 9 * 6 *")).toBe("0 9 * 6 *");
  });

  it("returns raw string for interval-style schedules", () => {
    expect(formatSchedule("every 5m")).toBe("every 5m");
  });
});
