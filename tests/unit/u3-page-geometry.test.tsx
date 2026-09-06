/**
 * U3 (T-0117): one container owns the left edge.
 *
 * `AppPageShell` owns no measure, so twenty pages centre their own column in
 * one of seven widths and nine declare none at all, in eight different padding
 * rhythms. The sticky header sits at a fixed x while the body moves under it,
 * and the measured result is that on 21 of 23 routes the h1 does not share a
 * left edge with the content beneath it: by up to 289px. On /results/artifacts
 * the header bar's own bottom rule stops 180px short of both viewport edges,
 * pointing at nothing.
 *
 * The fix is structural rather than a list of corrections. The shell takes the
 * header as a PROP and renders it full-bleed, with its CONTENT inside the same
 * container as the body, so the two edges cannot disagree. A child cannot be
 * both full-bleed and contained, which is why the header stops being a child.
 *
 * `density` decides what happens inside that container and never what the
 * container is. `prose` is left-aligned rather than centred on purpose: a
 * second centred container is exactly what puts one screen's content 400px
 * from its neighbour's.
 */
import { render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import AppPageShell from "@/components/layout/AppPageShell";

const ROOT = join(__dirname, "..", "..");

/** Every page component's source, keyed by its path under src/app. */
function pages(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const base = join(ROOT, "src", "app");
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") {
        out.push([
          full.slice(base.length + 1).split("\\").join("/"),
          readFileSync(full, "utf-8").replace(/\r\n/g, "\n"),
        ]);
      }
    }
  };
  walk(base);
  return out;
}

/** Lines of a source that are code rather than comment. */
const codeLines = (source: string): string[] =>
  source.split("\n").filter((l) => {
    const t = l.trimStart();
    return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*") && !t.startsWith("{/*");
  });

describe("the shell owns the measure", () => {
  it("puts the header's content and the body in the same container", () => {
    const { container } = render(
      <AppPageShell header={<h1>Missions</h1>}>
        <p>body</p>
      </AppPageShell>,
    );
    const measured = [...container.querySelectorAll("[data-ps-container]")];
    expect(measured).toHaveLength(2);
    const [headerBox, bodyBox] = measured;
    // The same class string, not merely a similar one: two containers that
    // agree by coincidence are two containers that will stop agreeing.
    expect(headerBox.className).toBe(bodyBox.className);
    expect(headerBox.contains(screen.getByRole("heading"))).toBe(true);
    expect(bodyBox.textContent).toContain("body");
  });

  it("names one measure and it is the page's", () => {
    const { container } = render(<AppPageShell header={<h1>x</h1>}>b</AppPageShell>);
    for (const box of container.querySelectorAll("[data-ps-container]")) {
      expect(box.className).toContain("max-w-ps-page");
      expect(box.className).toContain("mx-auto");
    }
  });

  it("leaves the header BAR full-bleed, outside that container", () => {
    const { container } = render(<AppPageShell header={<h1>x</h1>}>b</AppPageShell>);
    const bar = container.querySelector("header");
    expect(bar).not.toBeNull();
    expect(bar!.querySelector("[data-ps-container]")).not.toBeNull();
    // The bar itself must not be measured, or its rule stops short of the
    // viewport edge, which is what /results/artifacts does today.
    expect(bar!.hasAttribute("data-ps-container")).toBe(false);
    expect(bar!.className).not.toContain("max-w-");
  });

  it("renders no header bar at all when a page has no header", () => {
    const { container } = render(<AppPageShell>b</AppPageShell>);
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelectorAll("[data-ps-container]")).toHaveLength(1);
  });

  it("keeps the shell's own background and grid", () => {
    const { container } = render(<AppPageShell>b</AppPageShell>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("min-h-screen");
    expect(root.className).toContain("grid-bg");
  });
});

describe("density decides what is inside the container, never what it is", () => {
  const shell = (density?: "board" | "prose" | "pane") =>
    render(
      <AppPageShell header={<h1>x</h1>} density={density}>
        <p>body</p>
      </AppPageShell>,
    ).container;

  it.each(["board", "prose", "pane"] as const)("marks the body as %s", (density) => {
    expect(shell(density).querySelector(`[data-ps-density='${density}']`)).not.toBeNull();
  });

  it("defaults to board, because most of this product is a board", () => {
    expect(shell().querySelector("[data-ps-density='board']")).not.toBeNull();
  });

  /**
   * The whole point of the density prop. Whatever it does, the CONTAINER is the
   * same one the header used, so the left edge cannot move between screens.
   */
  it.each(["board", "prose", "pane"] as const)(
    "leaves the container alone at %s, so the left edge never moves",
    (density) => {
      const boxes = [...shell(density).querySelectorAll("[data-ps-container]")];
      expect(boxes).toHaveLength(2);
      expect(boxes[0].className).toBe(boxes[1].className);
    },
  );

  it("gives prose a narrower column that is LEFT aligned, not centred", () => {
    const col = shell("prose").querySelector("[data-ps-density='prose']") as HTMLElement;
    expect(col.className).toContain("max-w-ps-prose");
    // Centring it is the defect, not the fix: a second centred container is
    // what moves one screen's content 400px from its neighbour's.
    expect(col.className).not.toContain("mx-auto");
  });

  it("gives a pane no padding, so a split view can reach the edges", () => {
    const pane = shell("pane").querySelector("[data-ps-density='pane']") as HTMLElement;
    expect(pane.className).not.toMatch(/\bp[xy]?-\d/);
    const board = shell("board").querySelector("[data-ps-density='board']") as HTMLElement;
    expect(board.className).toMatch(/\bpy-/);
  });
});

describe("and no page owns a measure of its own", () => {
  it("has pages to check, so none of this passes vacuously", () => {
    expect(pages().length).toBeGreaterThan(25);
  });

  it.each([
    ["a max-width", /className=(?:"|\{`)[^"`]*\bmax-w-/],
    ["a centring margin", /className=(?:"|\{`)[^"`]*\bmx-auto/],
  ])("no page declares %s", (_what, pattern) => {
    const offenders = pages()
      .filter(([, source]) => codeLines(source).some((l) => pattern.test(l)))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  /**
   * Every page goes through the shell, including the two that did not: the
   * dashboard wrote its own header bar and was the only screen with no
   * <header> element at all, and the composer was the only page of 29 not on
   * AppPageShell.
   */
  it("every page renders through AppPageShell", () => {
    const offenders = pages()
      .filter(([path]) => !path.startsWith("help/"))
      .filter(([, source]) => !source.includes("AppPageShell"))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("and hands it a header rather than writing its own bar", () => {
    const offenders = pages()
      .filter(([, source]) => codeLines(source).some((l) => /<header[\s>]/.test(l)))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  /**
   * PageHeader is the header's CONTENT now. If it still rendered the <header>
   * element there would be two, and the inner one would be measured, which is
   * the defect this batch removes.
   */
  it("and PageHeader no longer renders a bar of its own", () => {
    const source = readFileSync(
      join(ROOT, "src", "components", "layout", "PageHeader.tsx"),
      "utf-8",
    );
    expect(codeLines(source).some((l) => /<header[\s>]/.test(l))).toBe(false);
  });
});
