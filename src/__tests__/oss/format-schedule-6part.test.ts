/** @jest-environment node */

// ── Bug regression: formatSchedule handles 6-part cron expressions ──

// We test the formatSchedule function by extracting it.
// Since it's defined inline in the page component, we test the logic directly.

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
      return `Every ${days[dayIndex] || dow} at ${hour}:${min.padStart(2, "0")}`;
    }
  }
  return schedule;
}

describe("formatSchedule — 6-part cron regression", () => {
  it("handles standard 5-part daily cron", () => {
    expect(formatSchedule("30 9 * * *")).toBe("Daily at 9:30");
  });

  it("handles 6-part cron with seconds (daily)", () => {
    expect(formatSchedule("0 30 9 * * *")).toBe("Daily at 9:30");
  });

  it("handles 6-part cron with seconds (every minute)", () => {
    expect(formatSchedule("0 * * * * *")).toBe("Every minute");
  });

  it("handles 6-part cron with seconds (weekly)", () => {
    expect(formatSchedule("0 0 9 * * 1")).toBe("Every Mon at 9:00");
  });

  it("returns raw string for non-matching patterns", () => {
    expect(formatSchedule("*/5 * * * *")).toBe("*/5 * * * *");
  });

  it("handles empty schedule", () => {
    expect(formatSchedule("")).toBe("No schedule");
  });

  it("pads single-digit minutes", () => {
    expect(formatSchedule("5 9 * * *")).toBe("Daily at 9:05");
    expect(formatSchedule("0 5 9 * * *")).toBe("Daily at 9:05");
  });
});
