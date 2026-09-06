/**
 * Documentation screenshots, one per guide (opt-in).
 *
 * The shot list is DERIVED from the guides themselves: every page under
 * docs/guides/ names the screen it documents in its front matter, so the list of
 * things to photograph is the list of things documented, and the two cannot
 * drift. Adding a guide adds its screenshot; there is no second list to update.
 *
 *   npm run screenshots
 *
 * Opt-in, so an ordinary e2e run never rewrites committed images.
 *
 * Three things are held steady, because a screenshot that changes on every run
 * is a diff nobody can review:
 *
 *  - The CLOCK is fixed. Otherwise "2 minutes ago" and every chart axis moves,
 *    and each capture shows a whole-file change.
 *  - The VIEWPORT is fixed at a documentation-friendly size rather than the
 *    project's default, so images crop consistently in the site and in Help.
 *  - Anything SECRET or MACHINE-SPECIFIC is masked: the auth token, the data
 *    directory, the database path and the agent home all name this machine, and
 *    a manual should not publish the reviewer's home directory.
 */
import { readFileSync, readdirSync, mkdirSync } from "fs";
import { join } from "path";

import { test, type Page } from "@playwright/test";

import { seedDemo } from "./seed-demo.mjs";

const RUN = process.env.CAPTURE_SCREENSHOTS === "1";
const OUT = join(process.cwd(), "docs", "images");
const GUIDES = join(process.cwd(), "docs", "guides");

/** A guide's screen and the image it will carry. */
interface Shot {
  slug: string;
  route: string;
  file: string;
}

/**
 * Read the shot list out of the guides' front matter.
 *
 * Deliberately a hand-rolled two-line parse rather than a YAML dependency: the
 * two keys wanted are always plain scalars on their own line, and the docs
 * library that does parse front matter proper is ESM under scripts/, which this
 * spec would have to reach across the tsconfig boundary to import.
 */
function shots(): Shot[] {
  const out: Shot[] = [];
  for (const name of readdirSync(GUIDES).sort()) {
    if (!name.endsWith(".md")) continue;
    const body = readFileSync(join(GUIDES, name), "utf-8");
    const screen = /^screen:\s*(\S+)\s*$/m.exec(body)?.[1];
    if (!screen) continue;
    const slug = name.replace(/\.md$/, "");
    out.push({ slug, route: screen, file: `${slug}.png` });
  }
  return out;
}

/** Values that name this machine or this run, and must never reach an image. */
function secrets(): string[] {
  const found = [process.env.PS_E2E_AUTH_TOKEN, process.cwd(), process.env.HOME, process.env.USERPROFILE];
  return found.filter((v): v is string => typeof v === "string" && v.length > 8);
}

/**
 * Blank anything that would publish the reviewer's machine.
 *
 * Text nodes rather than whole elements: masking the element would leave a black
 * rectangle where the reader expects to see the SHAPE of the field, and the
 * point of the shot is the shape.
 */
async function redact(page: Page, values: string[]): Promise<void> {
  await page.evaluate((vals: string[]) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.nodeValue ?? "";
      if (vals.some((v) => v && text.includes(v))) hits.push(n as Text);
    }
    for (const node of hits) {
      let text = node.nodeValue ?? "";
      for (const v of vals) if (v) text = text.split(v).join("/home/operator");
      node.nodeValue = text;
    }
  }, values);
}

test.describe("doc screenshots", () => {
  test.skip(!RUN, "set CAPTURE_SCREENSHOTS=1 (npm run screenshots) to regenerate");

  test.beforeAll(async ({ request }) => {
    mkdirSync(OUT, { recursive: true });
    await seedDemo(request);
  });

  for (const shot of shots()) {
    test(`capture ${shot.file}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-06-01T09:30:00Z"));
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto(shot.route, { waitUntil: "domcontentloaded" });
      // Every screen is a client component: its own heading does not exist until
      // hydration, so waiting for the shell would photograph an empty frame.
      await page.getByRole("heading").first().waitFor({ timeout: 30_000 });
      // Count-ups, charts and the query layer settle after that.
      await page.waitForTimeout(2_000);

      await redact(page, secrets());
      await page.screenshot({ path: join(OUT, shot.file), fullPage: true });
    });
  }
});
