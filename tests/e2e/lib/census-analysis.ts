/**
 * The arithmetic half of the design census (U0, T-0114).
 *
 * The census exists because "it looks better" is not a result. The overhaul's
 * claims are counts, and a count nobody can recompute is an adjective. So the
 * measuring is split in two: a collector that runs inside the page and knows
 * only how to read the DOM, and this module, which knows the maths and is
 * therefore unit-testable in jest without a browser.
 *
 * The collector never composites and never divides. It hands back raw records
 * whose colours have already been normalised to `rgba(r, g, b, a)` by the
 * browser's own colour engine (a canvas 2d context parses `oklab()`,
 * `color-mix()` and `color(srgb …)` and serialises them back as rgba, which is
 * the only conversion in reach that is guaranteed to agree with what was
 * painted). Everything below is pure.
 *
 * Why the compositing matters: the reconnaissance found that a naive contrast
 * pass silently SKIPS `oklab()` values, and Tailwind v4 emits `oklab()` for
 * every `bg-dark-900/40` in the tree. A gate that cannot see the app's most
 * common surface is a gate that reports zero for the wrong reason.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** An opaque colour. Alpha is gone by construction, not by assumption. */
export type Rgb = Omit<Rgba, "a">;

/**
 * Parse the `rgba(r, g, b, a)` / `rgb(r, g, b)` form a canvas 2d context
 * serialises to. Deliberately narrow: anything else is a collector bug, and a
 * parser that guesses is how a contrast gate ends up measuring nothing.
 */
export function parseRgba(css: string): Rgba | null {
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/i.exec(
    css.trim(),
  );
  if (!m) return null;
  const alphaRaw = m[4];
  const a =
    alphaRaw === undefined
      ? 1
      : alphaRaw.endsWith("%")
        ? Number(alphaRaw.slice(0, -1)) / 100
        : Number(alphaRaw);
  const out = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
  if ([out.r, out.g, out.b, out.a].some((n) => !Number.isFinite(n))) return null;
  return out;
}

/** `fg` painted over an opaque `bg`. Straight source-over in sRGB. */
export function compositeOver(fg: Rgba, bg: Rgb): Rgb {
  const a = Math.min(1, Math.max(0, fg.a));
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

/**
 * A stack of layers painted over an opaque base, outermost LAST.
 *
 * The collector walks from the element up to the root collecting every
 * non-transparent background, so index 0 is the element's own nearest backdrop
 * and the last entry is the one closest to the page. Painting therefore runs
 * from the end of the array toward the front.
 */
export function flattenStack(stack: Rgba[], base: Rgb): Rgb {
  let out = base;
  for (let i = stack.length - 1; i >= 0; i--) out = compositeOver(stack[i], out);
  return out;
}

const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG 2.x relative luminance. */
export function relativeLuminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG 2.x contrast ratio, always >= 1, order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Two decimal places, so a census diff is not noise from the last bit. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

// ── The record the collector produces ───────────────────────────────────────

export interface BorderRecord {
  /** Route the element was found on. */
  route: string;
  /** A short, stable description of the element, for diagnosing a regression. */
  what: string;
  /** The border colour, canvas-normalised. */
  colour: string;
  /** Backgrounds from the element outward, innermost first, canvas-normalised. */
  backdrop: string[];
  /** True when the element is, or is inside, something the user can operate. */
  control: boolean;
}

export interface TextRecord {
  route: string;
  size: number;
  mono: boolean;
}

export interface BoxRecord {
  route: string;
  what: string;
  /** `radius|border-colour|background` — the card chrome signature. */
  chrome: string;
  radius: string;
  height: number;
  shadow: string;
  zIndex: string;
  /** Set for anything the user can operate, so buttons can be counted apart. */
  control: boolean;
  /** Rendered width and height, for the hit-target floor. */
  w: number;
  h: number;
}

export interface GeometryRecord {
  route: string;
  /** Left edge of the h1, in CSS px from the viewport. */
  headingLeft: number | null;
  /** Left edge of the first block of page content beneath the header. */
  contentLeft: number | null;
  /** Width of the container the page centres its content in. */
  contentWidth: number | null;
  /** main.scrollWidth minus main.clientWidth; > 0 means silent sideways scroll. */
  overflowX: number;
}

export interface RawCensus {
  route: string;
  borders: BorderRecord[];
  text: TextRecord[];
  boxes: BoxRecord[];
  geometry: GeometryRecord;
  /** Composited page background, canvas-normalised, for the surface ladder. */
  pageBackground: string;
  /** Composited rail background, when the rail is on screen. */
  railBackground: string | null;
  /** The rail's own divider colour, when it has one. */
  railDivider: string | null;
}

// ── The census ──────────────────────────────────────────────────────────────

/**
 * Every number the overhaul claims to move. Each is a scalar so the baseline
 * can ratchet the same way design-lint's does: a value may fall, never rise,
 * unless a written reason says otherwise.
 */
export interface CensusCounts {
  routes: number;
  distinctFontSizes: number;
  /** Share of text nodes at 12px, 0 to 1. */
  twelvePxShare: number;
  /** Share of text nodes in the mono face, 0 to 1. */
  monoShare: number;
  textBelowFloor: number;
  distinctBorderColours: number;
  distinctCardChromes: number;
  distinctButtonHeights: number;
  distinctButtonChromes: number;
  distinctRadii: number;
  distinctBoxShadows: number;
  /**
   * Layers actually PAINTED at rest, which is not the same as the layers the
   * source declares. Every overlay, dropdown and toast is closed while a census
   * runs, so this reads 1 on a tree whose source carries thirteen z values,
   * seven of them arbitrary. It guards against a new resting layer; the source
   * sprawl is design-lint's to refuse.
   */
  distinctZLayers: number;
  controlBordersBelowThree: number;
  decorativeBordersBelowThree: number;
  hitTargetsBelowTwentyFour: number;
  /** Routes whose h1 does not share a left edge with its content. */
  routesWithMisalignedHeading: number;
  /** Worst |h1.left - content.left| across every route, in px. */
  worstHeadingOffset: number;
  distinctContentWidths: number;
  routesOverflowingX: number;
  /** Rail surface against the page it sits beside. Higher is better. */
  railVsPageContrast: number;
  /** The rail's divider against the page. Higher is better. */
  railDividerContrast: number;
}

/** Counts that must FALL to improve. Everything else must rise. */
export const LOWER_IS_BETTER: ReadonlySet<keyof CensusCounts> = new Set([
  "distinctFontSizes",
  "twelvePxShare",
  "monoShare",
  "textBelowFloor",
  "distinctBorderColours",
  "distinctCardChromes",
  "distinctButtonHeights",
  "distinctButtonChromes",
  "distinctRadii",
  "distinctBoxShadows",
  "distinctZLayers",
  "controlBordersBelowThree",
  "decorativeBordersBelowThree",
  "hitTargetsBelowTwentyFour",
  "routesWithMisalignedHeading",
  "worstHeadingOffset",
  "distinctContentWidths",
  "routesOverflowingX",
]);

/** How close two left edges must be to count as one edge. */
export const HEADING_ALIGNMENT_TOLERANCE_PX = 1;

/** WCAG 1.4.11: the floor for a boundary that identifies a component. */
export const NON_TEXT_CONTRAST_FLOOR = 3;

/** The project's own declared legibility floor. */
export const TYPE_FLOOR_PX = 12;

/** WCAG 2.5.8 at AA. */
export const HIT_TARGET_FLOOR_PX = 24;

/**
 * Reduce the raw per-route records to the scalars the baseline ratchets.
 *
 * Contrast is computed HERE and not in the page, so it can be tested against
 * hand-computed ratios. A number produced only by the thing it is measuring
 * cannot fail in a way anyone would notice.
 */
export function summarise(raw: RawCensus[]): CensusCounts {
  const fontSizes = new Set<number>();
  const borderColours = new Set<string>();
  const cardChromes = new Set<string>();
  const buttonHeights = new Set<number>();
  const buttonChromes = new Set<string>();
  const radii = new Set<string>();
  const shadows = new Set<string>();
  const zLayers = new Set<string>();
  const contentWidths = new Set<number>();

  let textNodes = 0;
  let twelvePx = 0;
  let mono = 0;
  let belowFloor = 0;
  let controlBad = 0;
  let decorativeBad = 0;
  let smallTargets = 0;
  let misaligned = 0;
  let worstOffset = 0;
  let overflowing = 0;
  let railVsPage = Infinity;
  let railDivider = Infinity;

  for (const page of raw) {
    for (const t of page.text) {
      textNodes += 1;
      fontSizes.add(t.size);
      if (t.size === 12) twelvePx += 1;
      if (t.size < TYPE_FLOOR_PX) belowFloor += 1;
      if (t.mono) mono += 1;
    }

    const base = parseRgba(page.pageBackground);
    const pageRgb: Rgb = base ? compositeOver(base, { r: 0, g: 0, b: 0 }) : { r: 0, g: 0, b: 0 };

    for (const b of page.borders) {
      const colour = parseRgba(b.colour);
      if (!colour) continue;
      borderColours.add(b.colour);
      const stack = b.backdrop.map(parseRgba).filter((c): c is Rgba => c !== null);
      const behind = flattenStack(stack, pageRgb);
      const painted = compositeOver(colour, behind);
      if (contrastRatio(painted, behind) < NON_TEXT_CONTRAST_FLOOR) {
        if (b.control) controlBad += 1;
        else decorativeBad += 1;
      }
    }

    for (const box of page.boxes) {
      if (box.chrome) cardChromes.add(box.chrome);
      if (box.radius) radii.add(box.radius);
      if (box.shadow && box.shadow !== "none") shadows.add(box.shadow);
      if (box.zIndex && box.zIndex !== "auto") zLayers.add(box.zIndex);
      if (box.control) {
        if (box.height > 0 && box.height < 60) buttonHeights.add(box.height);
        if (box.chrome) buttonChromes.add(`${box.height}|${box.chrome}`);
        if (box.w > 0 && box.h > 0 && (box.w < HIT_TARGET_FLOOR_PX || box.h < HIT_TARGET_FLOOR_PX)) {
          smallTargets += 1;
        }
      }
    }

    const g = page.geometry;
    if (g.contentWidth !== null) contentWidths.add(Math.round(g.contentWidth));
    if (g.headingLeft !== null && g.contentLeft !== null) {
      const offset = Math.abs(g.headingLeft - g.contentLeft);
      if (offset > HEADING_ALIGNMENT_TOLERANCE_PX) misaligned += 1;
      worstOffset = Math.max(worstOffset, Math.round(offset));
    }
    if (g.overflowX > 0) overflowing += 1;

    // The rail is one surface on every route; the worst reading is the honest
    // one, because a rail that only separates on some screens has not been
    // fixed.
    const rail = page.railBackground ? parseRgba(page.railBackground) : null;
    if (rail) {
      railVsPage = Math.min(railVsPage, contrastRatio(compositeOver(rail, pageRgb), pageRgb));
    }
    const divider = page.railDivider ? parseRgba(page.railDivider) : null;
    if (divider) {
      railDivider = Math.min(railDivider, contrastRatio(compositeOver(divider, pageRgb), pageRgb));
    }
  }

  return {
    routes: raw.length,
    distinctFontSizes: fontSizes.size,
    twelvePxShare: textNodes === 0 ? 0 : round2(twelvePx / textNodes),
    monoShare: textNodes === 0 ? 0 : round2(mono / textNodes),
    textBelowFloor: belowFloor,
    distinctBorderColours: borderColours.size,
    distinctCardChromes: cardChromes.size,
    distinctButtonHeights: buttonHeights.size,
    distinctButtonChromes: buttonChromes.size,
    distinctRadii: radii.size,
    distinctBoxShadows: shadows.size,
    distinctZLayers: zLayers.size,
    controlBordersBelowThree: controlBad,
    decorativeBordersBelowThree: decorativeBad,
    hitTargetsBelowTwentyFour: smallTargets,
    routesWithMisalignedHeading: misaligned,
    worstHeadingOffset: worstOffset,
    distinctContentWidths: contentWidths.size,
    routesOverflowingX: overflowing,
    railVsPageContrast: Number.isFinite(railVsPage) ? round2(railVsPage) : 0,
    railDividerContrast: Number.isFinite(railDivider) ? round2(railDivider) : 0,
  };
}

// ── The ratchet ─────────────────────────────────────────────────────────────

export interface Regression {
  key: keyof CensusCounts;
  was: number;
  now: number;
  /** True when the measure is one where a lower number is the improvement. */
  lowerIsBetter: boolean;
}

/**
 * Every measure that moved the wrong way.
 *
 * Modelled on design-lint's baseline: the committed numbers are a ceiling for
 * what should shrink and a floor for what should grow, and the only way past
 * is a written reason. `routes` is excluded because adding a route is not a
 * regression; it changes what every other number is measured over, which is why
 * a census diff always names it.
 */
export function regressions(
  baseline: CensusCounts,
  current: CensusCounts,
  tolerance = 0,
): Regression[] {
  const out: Regression[] = [];
  for (const key of Object.keys(baseline) as (keyof CensusCounts)[]) {
    if (key === "routes") continue;
    const was = baseline[key];
    const now = current[key];
    if (typeof was !== "number" || typeof now !== "number") continue;
    const lower = LOWER_IS_BETTER.has(key);
    const worse = lower ? now > was + tolerance : now < was - tolerance;
    if (worse) out.push({ key, was, now, lowerIsBetter: lower });
  }
  return out;
}

/** A one-line human summary of a regression, for the failure message. */
export function describeRegression(r: Regression): string {
  const direction = r.lowerIsBetter ? "rose" : "fell";
  return `${r.key} ${direction} from ${r.was} to ${r.now}`;
}
