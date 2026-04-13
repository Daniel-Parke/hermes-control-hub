import { parseScheduleOss } from "@/lib/schedule/parse-schedule-oss";

/**
 * Documents the Hermes OSS scheduling surface directly from `parseScheduleOss`.
 */
describe("parseScheduleOss (OSS schedule surface)", () => {
  it("accepts Hermes-style every-Nm / every-Nh", () => {
    expect(parseScheduleOss("every 15m")).toMatchObject({
      kind: "interval",
      minutes: 15,
    });
    expect(parseScheduleOss("every 2h")).toMatchObject({
      kind: "interval",
      minutes: 120,
    });
  });

  it("treats rich combined intervals as invalid", () => {
    const r = parseScheduleOss("every 1h 30m");
    expect(r.kind).toBe("invalid");
  });

  it("treats every-Nd / every-Nw as invalid on OSS surface", () => {
    expect(parseScheduleOss("every 2d").kind).toBe("invalid");
    expect(parseScheduleOss("every 1w").kind).toBe("invalid");
  });
});
