import {
  resolveSafeProfileName,
  safeSkillRelativePath,
  resolveSkillDirUnderRoot,
} from "@/lib/path-security";

describe("path-security", () => {
  describe("resolveSafeProfileName", () => {
    it("accepts default", () => {
      expect(resolveSafeProfileName(null)).toEqual({ ok: true, profile: "default" });
      expect(resolveSafeProfileName("default")).toEqual({ ok: true, profile: "default" });
    });
    it("accepts safe segment", () => {
      expect(resolveSafeProfileName("mc-swe-engineer")).toEqual({
        ok: true,
        profile: "mc-swe-engineer",
      });
    });
    it("rejects traversal", () => {
      expect(resolveSafeProfileName("../etc")).toEqual({
        ok: false,
        error: "Invalid profile name",
      });
    });
  });

  describe("safeSkillRelativePath", () => {
    it("joins valid segments", () => {
      expect(safeSkillRelativePath(["foo", "bar"])).toBe("foo/bar");
    });
    it("rejects dot segments", () => {
      expect(safeSkillRelativePath(["..", "x"])).toBeNull();
      expect(safeSkillRelativePath(["."])).toBeNull();
    });
  });

  describe("resolveSkillDirUnderRoot", () => {
    it("resolves under root", () => {
      const r = resolveSkillDirUnderRoot("/home/u/.hermes/skills", ["my-skill"]);
      expect(r).toEqual({ ok: true, skillDir: "/home/u/.hermes/skills/my-skill" });
    });
    it("rejects escape", () => {
      const r = resolveSkillDirUnderRoot("/home/u/.hermes/skills", ["..", "etc"]);
      expect(r.ok).toBe(false);
    });
  });
});
