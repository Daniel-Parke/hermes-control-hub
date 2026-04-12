import { existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { TEMPLATES } from "@/lib/mission-helpers";

// Use relative path from project root — works on CI and locally
const PROFILES_DIR = resolve(process.cwd(), "scripts/profiles");

const EXPECTED_PROFILES = [
  "mc-qa-engineer",
  "mc-devops-engineer",
  "mc-swe-engineer",
  "mc-data-engineer",
  "mc-data-scientist",
  "mc-ops-director",
  "mc-creative-lead",
  "mc-support-agent",
];

describe("Profile System", () => {
  describe("profile directories", () => {
    it("should have exactly 8 profile directories", () => {
      const entries = readdirSync(PROFILES_DIR, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      expect(dirs).toHaveLength(8);
    });

    it("should have all expected profile directories", () => {
      for (const profile of EXPECTED_PROFILES) {
        const dirPath = `${PROFILES_DIR}/${profile}`;
        expect(existsSync(dirPath)).toBe(true);
      }
    });

    for (const profile of EXPECTED_PROFILES) {
      describe(`${profile}`, () => {
        it("should have SOUL.md", () => {
          const soulPath = `${PROFILES_DIR}/${profile}/SOUL.md`;
          expect(existsSync(soulPath)).toBe(true);
        });

        it("should have AGENTS.md", () => {
          const agentsPath = `${PROFILES_DIR}/${profile}/AGENTS.md`;
          expect(existsSync(agentsPath)).toBe(true);
        });
      });
    }
  });

  describe("profile field propagation in templates", () => {
    it("should reference only profiles that exist on disk", () => {
      const templateProfiles = new Set(TEMPLATES.map((t) => t.profile));
      for (const profile of templateProfiles) {
        const dirPath = `${PROFILES_DIR}/${profile}`;
        expect(existsSync(dirPath)).toBe(true);
      }
    });

    it("should have every profile referenced by at least one template", () => {
      const templateProfiles = new Set(TEMPLATES.map((t) => t.profile));
      for (const expected of EXPECTED_PROFILES) {
        expect(templateProfiles.has(expected)).toBe(true);
      }
    });

    it("should have consistent profile-to-category mapping", () => {
      const profileCategoryMap: Record<string, string[]> = {};
      for (const tmpl of TEMPLATES) {
        if (!profileCategoryMap[tmpl.profile]) {
          profileCategoryMap[tmpl.profile] = [];
        }
        if (!profileCategoryMap[tmpl.profile].includes(tmpl.category)) {
          profileCategoryMap[tmpl.profile].push(tmpl.category);
        }
      }

      // Each profile should map to exactly one category
      for (const [profile, categories] of Object.entries(profileCategoryMap)) {
        expect(categories).toHaveLength(1);
      }
    });

    it("should have non-empty profile field on all templates", () => {
      for (const tmpl of TEMPLATES) {
        expect(tmpl.profile).toBeTruthy();
        expect(tmpl.profile.length).toBeGreaterThan(0);
      }
    });
  });
});
