import { parseScheduleOss } from "@/lib/schedule/parse-schedule-oss";

describe("parseScheduleOss — day interval support", () => {
  it("parses 'every 1d' as 1440 minutes", () => {
    const result = parseScheduleOss("every 1d");
    expect(result).toEqual({ kind: "interval", minutes: 1440, display: "every 1440m" });
  });

  it("parses 'every 3d' as 4320 minutes", () => {
    const result = parseScheduleOss("every 3d");
    expect(result).toEqual({ kind: "interval", minutes: 4320, display: "every 4320m" });
  });

  it("parses 'every 7d' as 10080 minutes", () => {
    const result = parseScheduleOss("every 7d");
    expect(result).toEqual({ kind: "interval", minutes: 10080, display: "every 10080m" });
  });

  it("parses '1d' (no 'every' prefix) as 1440 minutes", () => {
    const result = parseScheduleOss("1d");
    expect(result).toEqual({ kind: "interval", minutes: 1440, display: "every 1440m" });
  });

  it("parses 'every 1day' as 1440 minutes", () => {
    const result = parseScheduleOss("every 1day");
    expect(result).toEqual({ kind: "interval", minutes: 1440, display: "every 1440m" });
  });

  it("parses 'every 2days' as 2880 minutes", () => {
    const result = parseScheduleOss("every 2days");
    expect(result).toEqual({ kind: "interval", minutes: 2880, display: "every 2880m" });
  });

  // Verify existing minute/hour intervals still work
  it("still parses minute intervals correctly", () => {
    expect(parseScheduleOss("every 5m")).toEqual({ kind: "interval", minutes: 5, display: "every 5m" });
    expect(parseScheduleOss("every 30m")).toEqual({ kind: "interval", minutes: 30, display: "every 30m" });
  });

  it("still parses hour intervals correctly", () => {
    expect(parseScheduleOss("every 1h")).toEqual({ kind: "interval", minutes: 60, display: "every 60m" });
    expect(parseScheduleOss("every 4h")).toEqual({ kind: "interval", minutes: 240, display: "every 240m" });
  });

  it("still returns invalid for unrecognized schedules", () => {
    expect(parseScheduleOss("banana").kind).toBe("invalid");
    expect(parseScheduleOss("").kind).toBe("invalid");
  });
});
