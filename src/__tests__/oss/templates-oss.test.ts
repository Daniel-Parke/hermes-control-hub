import { TEMPLATES_OSS } from "@/lib/mission-templates-oss";

describe("OSS built-in templates", () => {
  it("ships a minimal Hermes-aligned template set", () => {
    expect(TEMPLATES_OSS.length).toBe(8);
  });

  it("has unique ids", () => {
    const ids = TEMPLATES_OSS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
