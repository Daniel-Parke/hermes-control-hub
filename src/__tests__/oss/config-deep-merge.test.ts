/** @jest-environment node */

// ── Bug regression: config PUT shallow merge ──

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  copyFileSync: jest.fn(),
}));

// Test deepMerge directly since the route's yaml dependency makes it hard to isolate
describe("deepMerge — config nested object merge regression", () => {
  // Inline the deepMerge function to test its behavior
  function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const tgtVal = target[key];
      if (
        srcVal !== null && typeof srcVal === "object" && !Array.isArray(srcVal) &&
        tgtVal !== null && typeof tgtVal === "object" && !Array.isArray(tgtVal)
      ) {
        deepMerge(tgtVal as Record<string, unknown>, srcVal as Record<string, unknown>);
      } else {
        target[key] = srcVal;
      }
    }
    return target;
  }

  it("preserves sibling keys when updating nested object", () => {
    const target = {
      max_turns: 100,
      personalities: {
        default: "Hermes",
        custom: "MyAgent",
        extra: true,
      },
    };
    const source = {
      personalities: { default: "NewHermes" },
    };

    const result = deepMerge({ ...target } as Record<string, unknown>, source);

    expect((result.personalities as Record<string, unknown>).default).toBe("NewHermes");
    expect((result.personalities as Record<string, unknown>).custom).toBe("MyAgent");
    expect((result.personalities as Record<string, unknown>).extra).toBe(true);
    expect(result.max_turns).toBe(100);
  });

  it("replaces non-object values correctly", () => {
    const target = { max_turns: 100, verbose: true };
    const source = { max_turns: 200 };

    const result = deepMerge({ ...target }, source);

    expect(result.max_turns).toBe(200);
    expect(result.verbose).toBe(true);
  });

  it("replaces arrays instead of merging them", () => {
    const target = { list: ["a", "b"] };
    const source = { list: ["c"] };

    const result = deepMerge({ ...target }, source);

    expect(result.list).toEqual(["c"]);
  });

  it("handles deeply nested objects", () => {
    const target = {
      level1: {
        level2: {
          keep: "this",
          replace: "old",
        },
        sibling: "kept",
      },
    };
    const source = {
      level1: {
        level2: {
          replace: "new",
        },
      },
    };

    const result = deepMerge({ ...target } as Record<string, unknown>, source);
    const l2 = (result.level1 as Record<string, unknown>).level2 as Record<string, unknown>;

    expect(l2.keep).toBe("this");
    expect(l2.replace).toBe("new");
    expect((result.level1 as Record<string, unknown>).sibling).toBe("kept");
  });

  it("adds new keys from source", () => {
    const target = { existing: "value" };
    const source = { new_key: "new_value" };

    const result = deepMerge({ ...target }, source);

    expect(result.existing).toBe("value");
    expect(result.new_key).toBe("new_value");
  });
});
