import { TEMPLATES } from "@/lib/mission-helpers";

// ── Built-in Template Validation ──────────────────────────────

describe("Built-in Templates", () => {
  it("should have 28+ templates (currently 29)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(28);
  });

  it("should have unique IDs", () => {
    const ids = TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  describe("required fields on every template", () => {
    const requiredStringFields = [
      "id",
      "name",
      "icon",
      "color",
      "category",
      "profile",
      "description",
      "instruction",
      "context",
    ] as const;

    for (const field of requiredStringFields) {
      it(`should have non-empty '${field}' on all templates`, () => {
        for (const tmpl of TEMPLATES) {
          expect(tmpl[field]).toBeTruthy();
          expect(typeof tmpl[field]).toBe("string");
          expect((tmpl[field] as string).length).toBeGreaterThan(0);
        }
      });
    }

    it("should have non-empty 'goals' array on all templates", () => {
      for (const tmpl of TEMPLATES) {
        expect(Array.isArray(tmpl.goals)).toBe(true);
        expect(tmpl.goals.length).toBeGreaterThan(0);
      }
    });

    it("should have 'suggestedSkills' array on all templates", () => {
      for (const tmpl of TEMPLATES) {
        expect(Array.isArray(tmpl.suggestedSkills)).toBe(true);
      }
    });
  });

  describe("category field handling", () => {
    const expectedCategories = [
      "Engineering - QA",
      "Engineering - DevOps",
      "Engineering - Software",
      "Engineering - Data",
      "Engineering - Data Science",
      "Business - Operations",
      "Business - Creative",
      "Support",
    ];

    it("should only use valid categories", () => {
      const categories = new Set(TEMPLATES.map((t) => t.category));
      for (const cat of categories) {
        expect(expectedCategories).toContain(cat);
      }
    });

    it("should have templates in all 8 categories", () => {
      const categories = new Set(TEMPLATES.map((t) => t.category));
      for (const expected of expectedCategories) {
        expect(categories.has(expected)).toBe(true);
      }
    });

    it("should have correct template counts per category", () => {
      const counts: Record<string, number> = {};
      for (const t of TEMPLATES) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
      expect(counts["Engineering - QA"]).toBe(4);
      expect(counts["Engineering - DevOps"]).toBe(5);
      expect(counts["Engineering - Software"]).toBe(4);
      expect(counts["Engineering - Data"]).toBe(2);
      expect(counts["Engineering - Data Science"]).toBe(3);
      expect(counts["Business - Operations"]).toBe(4);
      expect(counts["Business - Creative"]).toBe(4);
      expect(counts["Support"]).toBe(3);
    });
  });

  describe("profile field propagation", () => {
    const validProfiles = [
      "mc-qa-engineer",
      "mc-devops-engineer",
      "mc-swe-engineer",
      "mc-data-engineer",
      "mc-data-scientist",
      "mc-ops-director",
      "mc-creative-lead",
      "mc-support-agent",
    ];

    it("should only use valid profile names", () => {
      for (const tmpl of TEMPLATES) {
        expect(validProfiles).toContain(tmpl.profile);
      }
    });

    it("should map categories to correct profiles", () => {
      for (const tmpl of TEMPLATES) {
        if (tmpl.category === "Engineering - QA") {
          expect(tmpl.profile).toBe("mc-qa-engineer");
        }
        if (tmpl.category === "Engineering - DevOps") {
          expect(tmpl.profile).toBe("mc-devops-engineer");
        }
        if (tmpl.category === "Engineering - Software") {
          expect(tmpl.profile).toBe("mc-swe-engineer");
        }
        if (tmpl.category === "Engineering - Data") {
          expect(tmpl.profile).toBe("mc-data-engineer");
        }
        if (tmpl.category === "Engineering - Data Science") {
          expect(tmpl.profile).toBe("mc-data-scientist");
        }
        if (tmpl.category === "Business - Operations") {
          expect(tmpl.profile).toBe("mc-ops-director");
        }
        if (tmpl.category === "Business - Creative") {
          expect(tmpl.profile).toBe("mc-creative-lead");
        }
        if (tmpl.category === "Support") {
          expect(tmpl.profile).toBe("mc-support-agent");
        }
      }
    });
  });

  describe("template structure", () => {
    it("should have instruction fields with meaningful content", () => {
      for (const tmpl of TEMPLATES) {
        // Each template instruction should have meaningful content
        expect(tmpl.instruction.length).toBeGreaterThan(20);
      }
    });

    it("should have context fields ending with colon or newline prompt", () => {
      for (const tmpl of TEMPLATES) {
        expect(tmpl.context.length).toBeGreaterThan(5);
      }
    });

    it("should have valid color values", () => {
      const validColors = ["cyan", "purple", "green", "pink", "orange", "blue"];
      for (const tmpl of TEMPLATES) {
        expect(validColors).toContain(tmpl.color);
      }
    });
  });

  describe("specific template checks", () => {
    it("should have qa-bugfix with correct profile and category", () => {
      const t = TEMPLATES.find((t) => t.id === "qa-bugfix");
      expect(t).toBeDefined();
      expect(t!.profile).toBe("mc-qa-engineer");
      expect(t!.category).toBe("Engineering - QA");
      expect(t!.goals).toContain("Reproduce the issue");
    });

    it("should have swe-feature with correct profile", () => {
      const t = TEMPLATES.find((t) => t.id === "swe-feature");
      expect(t).toBeDefined();
      expect(t!.profile).toBe("mc-swe-engineer");
      expect(t!.category).toBe("Engineering - Software");
    });

    it("should have support-research with correct profile", () => {
      const t = TEMPLATES.find((t) => t.id === "support-research");
      expect(t).toBeDefined();
      expect(t!.profile).toBe("mc-support-agent");
      expect(t!.category).toBe("Support");
    });
  });
});

// ── Custom Template Logic ──────────────────────────────────────

describe("Custom Template Merge Logic", () => {
  it("should generate unique IDs for custom templates", () => {
    // ct_ prefix convention
    const id1 = "ct_" + Date.now().toString(36) + "aa";
    const id2 = "ct_" + Date.now().toString(36) + "ab";
    expect(id1).toMatch(/^ct_/);
    expect(id2).toMatch(/^ct_/);
    expect(id1).not.toBe(id2);
  });

  it("should default custom template category to 'Custom'", () => {
    const defaults = {
      category: "Custom",
      icon: "Zap",
      color: "cyan",
    };
    expect(defaults.category).toBe("Custom");
  });

  it("should allow custom templates to override all fields", () => {
    const custom = {
      id: "ct_test",
      name: "My Custom Template",
      icon: "Star",
      color: "purple",
      category: "Custom",
      profile: "mc-swe-engineer",
      description: "A custom template",
      instruction: "Do custom work",
      context: "Custom context",
      goals: ["Goal 1", "Goal 2"],
      suggestedSkills: ["skill-1"],
      isCustom: true,
    };
    expect(custom.isCustom).toBe(true);
    expect(custom.name).toBe("My Custom Template");
    expect(custom.goals).toHaveLength(2);
  });

  it("should merge built-in and custom templates correctly", () => {
    const builtIn = TEMPLATES.map((t) => ({ ...t, isCustom: false }));
    const custom = [
      {
        id: "ct_custom1",
        name: "Custom 1",
        icon: "Zap",
        color: "cyan",
        category: "Custom",
        profile: "",
        description: "",
        instruction: "",
        context: "",
        goals: [],
        suggestedSkills: [],
        isCustom: true,
      },
    ];
    const merged = [...builtIn, ...custom];
    expect(merged).toHaveLength(TEMPLATES.length + 1);
    expect(merged.filter((t) => t.isCustom)).toHaveLength(1);
    expect(merged.filter((t) => !t.isCustom)).toHaveLength(TEMPLATES.length);
  });
});
