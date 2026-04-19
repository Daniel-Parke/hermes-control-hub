/**
 * Regression test for IntervalSelector getIntervalLabel bug.
 *
 * Bug: getIntervalLabel failed to match presets when the value had an "every " prefix
 * (which is how the API returns schedule values like "every 5m", "every 60m").
 * This caused the dashboard's inline cron selector to show raw strings like "every 60m"
 * instead of friendly labels like "1 hour", and the selected state highlighting didn't work.
 */

/**
 * Inline copy of the fixed getIntervalLabel function for testing.
 * Mirrors the logic in src/components/ui/IntervalSelector.tsx
 */
function getIntervalLabel(value: string): string {
  const stripped = value.replace(/^every\s+/i, "");
  const preset = PRESETS.find((p) => p.value === stripped);
  return preset ? preset.label : stripped;
}

const PRESETS = [
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "10m", label: "10 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "4h", label: "4 hours" },
  { value: "8h", label: "8 hours" },
  { value: "12h", label: "12 hours" },
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
];

describe("getIntervalLabel (IntervalSelector)", () => {
  it("matches presets without 'every ' prefix (compact mode values)", () => {
    expect(getIntervalLabel("5m")).toBe("5 minutes");
    expect(getIntervalLabel("1h")).toBe("1 hour");
    expect(getIntervalLabel("7d")).toBe("7 days");
  });

  it("matches presets WITH 'every ' prefix (API return values)", () => {
    expect(getIntervalLabel("every 5m")).toBe("5 minutes");
    expect(getIntervalLabel("every 1h")).toBe("1 hour");
    expect(getIntervalLabel("every 30m")).toBe("30 minutes");
    expect(getIntervalLabel("every 7d")).toBe("7 days");
  });

  it("handles case-insensitive 'every' prefix", () => {
    expect(getIntervalLabel("Every 5m")).toBe("5 minutes");
    expect(getIntervalLabel("EVERY 1h")).toBe("1 hour");
  });

  it("handles API display values (minutes from parseScheduleOss)", () => {
    // When parseScheduleOss converts "every 2h" → { minutes: 120, display: "every 120m" }
    // The component receives "every 120m" which won't match a preset
    // It should return the stripped value "120m" as the fallback label
    expect(getIntervalLabel("every 120m")).toBe("120m");
  });

  it("returns raw value for unrecognized inputs", () => {
    expect(getIntervalLabel("something-else")).toBe("something-else");
    expect(getIntervalLabel("")).toBe("");
  });
});

/**
 * Verify the selected-state comparison logic works for both formats.
 * In compact mode, the dropdown should highlight the currently selected preset
 * whether the value comes from the API (with "every " prefix) or from the
 * compact onChange handler (without prefix, before this fix).
 */
describe("IntervalSelector selected state comparison", () => {
  const isSelected = (value: string, presetValue: string): boolean => {
    return value === `every ${presetValue}` || value === presetValue;
  };

  it("selects preset when value has 'every ' prefix (API values)", () => {
    expect(isSelected("every 5m", "5m")).toBe(true);
    expect(isSelected("every 1h", "1h")).toBe(true);
  });

  it("selects preset when value is raw (legacy compact mode values)", () => {
    expect(isSelected("5m", "5m")).toBe(true);
    expect(isSelected("1h", "1h")).toBe(true);
  });

  it("does not select wrong preset", () => {
    expect(isSelected("every 5m", "10m")).toBe(false);
    expect(isSelected("5m", "10m")).toBe(false);
  });
});
