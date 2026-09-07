/**
 * U4 (T-0118): every region gets an edge.
 *
 * This is the batch behind the operator's headline complaint, and the complaint
 * is a SURFACE problem rather than a text one: the rail's own labels already
 * measure 6.18:1, so brightening them cannot fix "the sidebar is hard to see"
 * and would only make the type problem worse. What is wrong is that the rail
 * sits at 1.06:1 against the page beside it, every card fill sits within 1.03:1
 * of the page behind it, and every boundary in the product is one 1px rule at
 * 1.25:1 against the 3:1 WCAG 1.4.11 asks of a component boundary.
 *
 * Measured before this batch: 300 `bg-dark-*` uses across 25 spellings for what
 * the tokens name as three roles, 202 `bg-white/N`, and 435 `border-white/N`
 * across 9 undeclared alphas. U2 derived the ladder and nothing consumed it.
 * This is the consuming.
 *
 * What it deliberately does NOT do: the 346 accent-tinted borders across 71
 * spellings, and the white DOTS (`bg-white/20|25|30|40`) that are status marks
 * rather than surfaces. Both are colour-that-means-something, they are S5, and
 * they are U6. The census's controlBordersBelowThree ratchet is what keeps them
 * falling in the meantime; nothing here declares them acceptable.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");

/** Every .tsx/.ts/.css under src/, keyed by its repo-relative path. */
function sources(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(entry.name)) {
        out.push([
          `src/${full.slice(SRC.length + 1).split("\\").join("/")}`,
          readFileSync(full, "utf-8").replace(/\r\n/g, "\n"),
        ]);
      }
    }
  };
  walk(SRC);
  return out;
}

/** Sites of a pattern, as `path:line  text`, so a failure names them. */
function sites(pattern: RegExp, skip: (path: string) => boolean = () => false): string[] {
  const found: string[] = [];
  for (const [path, source] of sources()) {
    if (skip(path)) continue;
    source.split("\n").forEach((line, i) => {
      const t = line.trimStart();
      // A comment naming a defect is not a use of it. Every one of these files
      // is commented, and several comments quote the spelling they replaced.
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
      if (pattern.test(line)) found.push(`${path}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  return found;
}

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8").replace(/\r\n/g, "\n");

describe("the ladder is the only surface vocabulary left", () => {
  it("has sources to check, so none of this passes vacuously", () => {
    expect(sources().length).toBeGreaterThan(200);
  });

  /**
   * The declarations themselves stay: `--color-dark-*` is the primitive ramp
   * the roles are still allowed to alias, and contrast-check reads it. What
   * goes is 300 components each choosing a rung.
   */
  it("no component picks a rung off the dark ramp", () => {
    expect(sites(/\bbg-dark-\d{3}/, (p) => p === "src/app/globals.css")).toEqual([]);
  });

  it("no component tints a surface with a raw white alpha", () => {
    expect(sites(/\bbg-white\/(?:5|10|\[0\.0\d+\])\b/)).toEqual([]);
  });

  it("no component draws a boundary with a raw white alpha", () => {
    expect(sites(/\b(?:border|divide|ring)-white\/(?:\[[^\]]+\]|\d)/)).toEqual([]);
  });

  /**
   * The two rungs U2 left alive so that declaring the ladder repainted
   * nothing. `well` was an alias for dark-800, which is LIGHTER than the card
   * it sat in, so every input in the product read as a lift rather than a
   * well; `surface-hairline` was white at 10%, which is the 1.25:1 rule this
   * batch is removing.
   */
  it.each([
    ["ps-surface-well", /\bps-surface-well\b/],
    ["ps-surface-hairline", /\bps-surface-hairline\b/],
  ])("no component or stylesheet still names %s", (_name, pattern) => {
    expect(sites(pattern)).toEqual([]);
  });
});

describe("the rail is a surface with one edge", () => {
  const sidebar = () => read("src/components/layout/Sidebar.tsx");
  const layout = () => read("src/app/layout.tsx");

  it("paints itself on the panel rung, at both breakpoints", () => {
    const source = sidebar();
    expect(source).toContain("bg-ps-surface-panel");
    // Not one surface on a phone and another on a desktop: it measured
    // 1.02:1 against the page at one breakpoint and 1.10:1 at the other.
    expect(source).not.toMatch(/lg:bg-/);
  });

  it("draws exactly one divider, and it is the shell seam", () => {
    expect(sidebar()).toContain("border-r border-ps-edge");
    // The wrapper drew a second one at layout.tsx:107, so the seam was two
    // stacked 1px rules at 1.25:1 apiece pretending to be one.
    expect(layout()).not.toMatch(/border-r/);
  });

  /**
   * A backdrop filter behind an opaque surface blurs nothing and costs a
   * compositing layer on every scroll. It was doing that on the rail because
   * the rail used to be translucent.
   */
  it("stops blurring what is behind an opaque surface", () => {
    expect(sidebar()).not.toContain("backdrop-blur");
  });
});

describe("the code mirror names the same rungs the CSS does", () => {
  const theme = () => read("src/lib/theme.ts");

  it.each([
    ["ground", "bg-ps-surface-ground"],
    ["panel", "bg-ps-surface-panel"],
    ["raised", "bg-ps-surface-raised"],
    ["inset", "bg-ps-surface-inset"],
    ["edge", "border-ps-edge"],
    ["hairline", "border-ps-edge-hairline"],
    ["emphasis", "border-ps-edge-emphasis"],
  ])("carries %s", (_role, utility) => {
    expect(theme()).toContain(utility);
  });

  /**
   * `well` and `hairline` were the old map's names for rungs that no longer
   * exist. Leaving them would leave two vocabularies and a rule that says
   * which one is right, which is how there came to be 25 spellings.
   */
  it("and does not carry the two the ladder replaced", () => {
    expect(theme()).not.toMatch(/\bwell:/);
    expect(theme()).not.toMatch(/border-ps-surface-hairline/);
  });
});
