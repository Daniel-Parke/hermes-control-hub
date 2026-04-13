import { parseSchedule } from "@/lib/utils";

describe("parseSchedule (commercial rich intervals)", () => {
  it("should parse 'every 1h 30m' compound", () => {
    const r = parseSchedule("every 1h 30m");
    expect(r).toMatchObject({ kind: "interval", minutes: 90 });
  });

  it("should parse 'every 2d'", () => {
    const r = parseSchedule("every 2d");
    expect(r).toMatchObject({ kind: "interval", minutes: 2880 });
  });

  it("should parse 'every 1w'", () => {
    const r = parseSchedule("every 1w");
    expect(r).toMatchObject({ kind: "interval", minutes: 10080 });
  });
});
