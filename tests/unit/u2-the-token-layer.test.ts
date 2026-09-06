/**
 * U2 (T-0116): the token layer the design system never had.
 *
 * `@theme` declares 38 colours, three container widths, two fonts and exactly
 * one spacing step. It declares no type scale at all, no radius scale, no
 * elevation, no z ladder and no motion. And the one thing it does tokenise is
 * broken at the perceptual level: the surface ladder spans 1.00 to 1.19:1
 * against the painted ground, so the rail measures 1.06:1 against the page it
 * sits beside and nothing in the product has an edge.
 *
 * This batch declares the missing scales and re-derives the surfaces. It
 * repaints NOTHING: every new name is new, `--color-ps-surface-panel` has zero
 * consumers in .tsx, and the radius scale is house-prefixed precisely so that
 * declaring it cannot silently change what `rounded-lg` means in 324 places.
 * The codemods that consume all this are U4 to U6.
 *
 * The surfaces are DERIVED, the way the text tiers were: given the ground and a
 * hue to travel along, scripts/tooling/derive-surface-ladder.mjs solves for the
 * dimmest colour that reaches each target ratio. The values below are that
 * script's output, and the assertions recompute the ratios from the hexes in
 * globals.css rather than trusting either.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  GROUND,
  LADDER,
  contrast,
  derive,
  hexToRgb,
  luminance,
  solve,
} from "../../scripts/tooling/derive-surface-ladder.mjs";

const ROOT = join(__dirname, "..", "..");
const css = (): string =>
  readFileSync(join(ROOT, "src", "app", "globals.css"), "utf-8").replace(/\r\n/g, "\n");

/** The value of a `--name: value;` declaration, from the real stylesheet. */
function token(name: string): string | null {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(css());
  return m ? m[1].trim() : null;
}

// ── the derivation itself ───────────────────────────────────────────────────

describe("the surface ladder is derived, not chosen", () => {
  it("puts the painted ground where the text tiers put it", () => {
    expect(GROUND).toBe("#040b12");
    expect(luminance(hexToRgb(GROUND))).toBeCloseTo(0.003088, 5);
  });

  /**
   * The bug this caught on the first run. `contrast()` is order-independent, so
   * a search for "1.45:1 against the panel" happily returned #000101: nearly
   * black, which clears the ratio by being DARKER. Every rung is meant to come
   * forward from the one it names.
   */
  it("only ever solves upward, so a rung cannot satisfy its ratio by being darker", () => {
    const base = hexToRgb("#1e3042");
    const got = solve(base, [38, 61, 84], 1.45);
    expect(luminance(got.rgb)).toBeGreaterThan(luminance(base));
    expect(contrast(got.rgb, base)).toBeGreaterThanOrEqual(1.45);
  });

  it("returns the DIMMEST colour that reaches the target, not merely one that does", () => {
    const base = hexToRgb(GROUND);
    const got = solve(base, [38, 61, 84], 1.45);
    // One step back along the ray must miss, or the answer was not the first.
    const dimmer = [38, 61, 84].map((c) => Math.round(c * (got.k - 0.01)));
    expect(contrast(dimmer as [number, number, number], base)).toBeLessThan(1.45);
  });

  it("throws rather than guessing when no colour on the ray can reach the target", () => {
    expect(() => solve(hexToRgb("#ffffff"), [1, 1, 1], 3)).toThrow(/reaches 3:1 above/);
  });

  it.each(LADDER.map((r) => [r.name, r.against, r.ratio]))(
    "%s clears its target against %s",
    (name, against, ratio) => {
      const table = derive();
      const base = against === "ground" ? hexToRgb(GROUND) : table.panel.rgb;
      expect(contrast(table[name as string].rgb, base)).toBeGreaterThanOrEqual(ratio as number);
    },
  );
});

// ── what globals.css must now declare ───────────────────────────────────────

describe("globals.css declares the ladder the script derived", () => {
  const table = derive();

  it.each([
    ["ps-surface-ground", GROUND],
    ["ps-surface-panel", table.panel.hex],
    ["ps-surface-raised", table.raised.hex],
    ["ps-edge", table.edge.hex],
    ["ps-edge-hairline", table["edge-hairline"].hex],
    ["ps-edge-emphasis", table["edge-emphasis"].hex],
  ])("--color-%s is %s", (name, value) => {
    expect(token(`color-${name}`)).toBe(value);
  });

  /**
   * The assertion that matters more than the values. Recompute the ratios from
   * what the stylesheet actually says, so that hand-editing a hex to something
   * prettier fails here rather than shipping.
   */
  it("and the hexes in the file still measure what they are supposed to measure", () => {
    const ground = hexToRgb(token("color-ps-surface-ground") as string);
    const panel = hexToRgb(token("color-ps-surface-panel") as string);
    expect(contrast(panel, ground)).toBeGreaterThanOrEqual(1.45);
    expect(contrast(hexToRgb(token("color-ps-surface-raised") as string), panel)).toBeGreaterThanOrEqual(1.45);
    expect(contrast(hexToRgb(token("color-ps-edge") as string), panel)).toBeGreaterThanOrEqual(3);
    expect(contrast(hexToRgb(token("color-ps-edge-hairline") as string), panel)).toBeGreaterThanOrEqual(1.6);
    expect(contrast(hexToRgb(token("color-ps-edge-emphasis") as string), panel)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The whole point, stated as the number the reconnaissance measured. Today
   * the rail is 1.06:1 against the page and its divider 1.25:1. If either of
   * those is still true after this batch, the batch did nothing.
   */
  it("is a real ladder now, not the 1.06:1 one the walk measured", () => {
    const ground = hexToRgb(token("color-ps-surface-ground") as string);
    const panel = hexToRgb(token("color-ps-surface-panel") as string);
    const edge = hexToRgb(token("color-ps-edge") as string);
    expect(contrast(panel, ground)).toBeGreaterThan(1.4);
    expect(contrast(edge, ground)).toBeGreaterThan(3);
  });

  it("keeps `inset` as the ground, because a near-black page cannot go darker", () => {
    expect(token("color-ps-surface-inset")).toBe("var(--color-ps-surface-ground)");
  });

  /**
   * Nothing repaints in this batch, and this is what that means: the three
   * surface names the tree actually uses today keep the values they had, and
   * are retired by the codemod that replaces their call sites, not here.
   */
  it("leaves the spellings the tree still uses exactly where they were", () => {
    expect(token("color-ps-surface-well")).toBe("var(--color-dark-800)");
    expect(token("color-ps-surface-hairline")).toBe("rgb(255 255 255 / 0.10)");
    expect(token("color-dark-950")).toBe("#040b12");
    expect(token("color-dark-900")).toBe("#0c1520");
  });
});

// ── the type scale ──────────────────────────────────────────────────────────

describe("there is a type scale, and it has five steps", () => {
  const STEPS: ReadonlyArray<[string, string, string]> = [
    ["micro", "0.75rem", "1rem"],
    ["body", "0.875rem", "1.3125rem"],
    ["lead", "1rem", "1.5rem"],
    ["title", "1.25rem", "1.75rem"],
    ["display", "1.75rem", "2.125rem"],
  ];

  it.each(STEPS)("--text-%s is %s on %s", (name, size, leading) => {
    expect(token(`text-${name}`)).toBe(size);
    expect(token(`text-${name}--line-height`)).toBe(leading);
  });

  it("has no step below the floor the project already declares", () => {
    for (const [, size] of STEPS) expect(parseFloat(size) * 16).toBeGreaterThanOrEqual(12);
  });

  /**
   * WCAG 1.4.12 asks 1.5 of body text, and seventeen prose blocks in this
   * product run at 1.33. `body` is the default, so `body` is where that has to
   * be true; `micro` is a mono label on one line and is exempt by not being
   * prose.
   */
  it("gives body text the line height WCAG asks of prose", () => {
    expect(parseFloat(token("text-body--line-height") as string) / parseFloat(token("text-body") as string))
      .toBeGreaterThanOrEqual(1.5);
    expect(parseFloat(token("text-lead--line-height") as string) / parseFloat(token("text-lead") as string))
      .toBeGreaterThanOrEqual(1.5);
  });

  it("declares exactly five, so the codemod has one number to drive toward", () => {
    const declared = [...css().matchAll(/--text-([a-z]+):/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(["body", "display", "lead", "micro", "title"]);
  });
});

// ── radius, elevation, layers, motion ───────────────────────────────────────

describe("the scales that did not exist at all", () => {
  it.each([
    ["radius-ps-sm", "4px"],
    ["radius-ps-md", "8px"],
    ["radius-ps-lg", "12px"],
  ])("--%s is %s", (name, value) => {
    expect(token(name)).toBe(value);
  });

  /**
   * House-prefixed on purpose. Tailwind already ships `--radius-sm/md/lg`, and
   * `rounded-lg` appears 324 times in this tree: redefining the built-in names
   * would repaint every one of them in a batch whose contract is that nothing
   * repaints.
   */
  it("does not redefine Tailwind's own radius names", () => {
    for (const name of ["radius-sm", "radius-md", "radius-lg", "radius-xl"]) {
      expect(new RegExp(`^\\s*--${name}:`, "m").test(css())).toBe(false);
    }
  });

  it.each([
    ["z-base", "0"],
    ["z-sticky", "10"],
    ["z-dropdown", "30"],
    ["z-overlay", "50"],
    ["z-modal", "60"],
    ["z-toast", "70"],
    ["z-tooltip", "80"],
  ])("--%s is %s", (name, value) => {
    expect(token(name)).toBe(value);
  });

  it("puts the ladder in the order things actually stack", () => {
    const order = ["base", "sticky", "dropdown", "overlay", "modal", "toast", "tooltip"];
    const values = order.map((n) => Number(token(`z-${n}`)));
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it("declares one resting elevation and one duration pair", () => {
    expect(token("shadow-ps-raised")).toBeTruthy();
    expect(token("ps-duration-fast")).toBe("120ms");
    expect(token("ps-duration")).toBe("200ms");
  });
});

// ── status colour, and colour that is not status ────────────────────────────

describe("there is one status ladder", () => {
  const STATES = ["idle", "queued", "running", "ok", "warn", "fail", "blocked"];

  it.each(STATES)("--color-status-%s is declared", (state) => {
    expect(token(`color-status-${state}`)).toBeTruthy();
  });

  /**
   * The finding this exists to end: twenty-two files each invented their own
   * state-to-colour map, and "failed" renders in three different hues, none of
   * them the declared danger token. One ladder, or it happens again.
   */
  it("says exactly what fail and ok are, once", () => {
    expect(token("color-status-fail")).toBe("var(--color-semantic-danger)");
    expect(token("color-status-ok")).toBe("var(--color-semantic-success)");
    expect(token("color-status-running")).toBe("var(--color-neon-cyan)");
  });

  it("and every state resolves to something already declared", () => {
    const declared = new Set([...css().matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]));
    for (const state of STATES) {
      const value = token(`color-status-${state}`) as string;
      const ref = /var\(--color-([a-z0-9-]+)\)/.exec(value);
      if (ref) expect(declared.has(ref[1])).toBe(true);
      else expect(value).toMatch(/^(#[0-9a-f]{6}|rgb\()/i);
    }
  });
});

// ── the measures ────────────────────────────────────────────────────────────

describe("two measures are declared, and the old three are still standing", () => {
  it("declares the page and the prose column", () => {
    expect(token("container-ps-page")).toBe("82rem");
    expect(token("container-ps-prose")).toBe("46rem");
  });

  it("has not yet removed the three the tree still names", () => {
    // Their four call sites move in U3; removing the tokens here would break
    // help/[[...slug]]/not-found.tsx and lockbook-tokens.test.ts for a batch.
    expect(token("container-ps-reading")).toBe("48rem");
    expect(token("container-ps-wide")).toBe("56rem");
    expect(token("container-ps-full")).toBe("80rem");
  });
});
