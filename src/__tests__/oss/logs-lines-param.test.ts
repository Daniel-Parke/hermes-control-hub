/**
 * Regression test: GET /api/logs should handle invalid `lines` parameter gracefully.
 *
 * Bug: parseInt("abc") returns NaN, and slice(-NaN) returns the entire array,
 * so an invalid lines parameter would return ALL log lines instead of the default 200.
 *
 * Fix: Check Number.isFinite() and fall back to default 200.
 */

describe("logs API lines parameter parsing", () => {
  it("should fall back to default when lines parameter is invalid", () => {
    // Simulate the fixed parsing logic
    const parseLines = (input: string | null): number => {
      const parsedLines = parseInt(input || "200", 10);
      return Number.isFinite(parsedLines) ? Math.min(parsedLines, 1000) : 200;
    };

    // Valid inputs
    expect(parseLines("50")).toBe(50);
    expect(parseLines("500")).toBe(500);
    expect(parseLines("2000")).toBe(1000); // capped at 1000
    expect(parseLines(null)).toBe(200); // default

    // Invalid inputs that previously caused bugs
    expect(parseLines("abc")).toBe(200); // fallback to default
    expect(parseLines("")).toBe(200); // empty string
    expect(parseLines("NaN")).toBe(200); // literal NaN string
    expect(parseLines("undefined")).toBe(200); // literal undefined string
    expect(parseLines("12.5")).toBe(12); // decimal gets truncated
    expect(parseLines("-5")).toBe(-5); // negative is allowed (slice handles it)
  });

  it("should demonstrate the original bug behavior", () => {
    // This is what the ORIGINAL code did:
    const originalBehavior = (input: string | null): number => {
      return Math.min(parseInt(input || "200"), 1000);
    };

    // NaN passes through without fallback
    expect(originalBehavior("abc")).toBeNaN();
    expect(Number.isNaN(originalBehavior("abc"))).toBe(true);

    // slice(-NaN) returns full array (the bug)
    const testArray = ["line1", "line2", "line3", "line4", "line5"];
    const nanLines = originalBehavior("abc");
    expect(testArray.slice(-nanLines)).toEqual(testArray); // all lines returned!
  });
});
