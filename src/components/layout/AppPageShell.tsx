// ═══════════════════════════════════════════════════════════════
// App Page Shell — the page frame, and the one container that owns
// the left edge
// ═══════════════════════════════════════════════════════════════
//
// This used to be a background and nothing else, so every page supplied its own
// column. Measured across 23 routes that produced seven content widths, eight
// left gutters and eight padding rhythms, and on 21 of them the h1 did not
// share a left edge with the content beneath it, by up to 289px. On
// /results/artifacts the header bar's own bottom rule stopped 180px short of
// both viewport edges, pointing at nothing. That is not twenty mistakes; it is
// a missing structure.
//
// The header is a PROP rather than a child because a child cannot be both
// full-bleed and contained, and both is exactly what a header bar is: its
// background and rule span the viewport while its words line up with the page.
// Handing it in lets the shell render the bar itself and put the header's
// content in the SAME container as the body, so the two edges cannot disagree.

import type { ReactNode } from "react";

import { shellHeaderBarClasses } from "@/lib/theme";

/**
 * What happens INSIDE the container. Never what the container is: the left edge
 * is the same on every screen at every density, which is the whole point.
 *
 *   board  the default, and most of this product. Full width, page rhythm.
 *   prose  a narrower column for longform, LEFT aligned inside the page
 *          container rather than centred in one of its own. Centring it is the
 *          defect: a second centred container is what moves one screen's
 *          content 400px from its neighbour's.
 *   pane   fills the remaining height and manages its own scrolling, for a
 *          split view: chat, the composer canvas, the reader.
 */
// Not exported: every call site spells the literal, so an exported alias would
// be a name with no readers, which is what this programme is deleting.
type PageDensity = "board" | "prose" | "pane";

interface AppPageShellProps {
  children: ReactNode;
  /** The page's header content, usually a <PageHeader>. Rendered in the bar. */
  header?: ReactNode;
  density?: PageDensity;
  /** Adds `.scanlines` overlay (requires parent `relative` for pseudo-element). */
  variant?: "default" | "scanlines";
  className?: string;
}

/**
 * The measure, and the only thing that decides a left edge. One string, used
 * verbatim in both places, so a change to the page width changes both or
 * neither.
 *
 * The density's own classes go on a CHILD of this, never on the same element.
 * `max-w-ps-page` and `max-w-ps-prose` together are decided by the order the
 * two rules happen to sit in the emitted stylesheet, which is not something a
 * call site can see or control.
 *
 * The gutter narrows on a phone because 24px each side of a 375px screen is
 * 13% of it. That is one string for every page, so the invariant is untouched:
 * at any given width every screen still has the same left edge. Measured on
 * /work/missions at 375, the flat 24px cost 16px of column against what that
 * page used to give itself.
 */
export const PAGE_MEASURE = "mx-auto w-full max-w-ps-page px-4 sm:px-6";

/**
 * Two steps, not eight. The census measured eight distinct gaps between a
 * page's top-level blocks; the rhythm is now 32px between sections here, and
 * 16px inside one, which is the only other step the system has.
 */
const DENSITY: Record<PageDensity, string> = {
  board: "py-6 space-y-8",
  prose: "py-8 space-y-8 max-w-ps-prose",
  pane: "flex-1 min-h-0 flex flex-col",
};

export default function AppPageShell({
  children,
  header,
  density = "board",
  variant = "default",
  className = "",
}: AppPageShellProps) {
  const fx = variant === "scanlines" ? "relative scanlines" : "";
  return (
    <div
      className={`min-h-screen bg-ps-surface-ground grid-bg flex flex-col ${fx} ${className}`.trim()}
    >
      {header ? (
        // Sticky and full-bleed. The BAR is what spans the viewport; the
        // container inside it is what the words line up with.
        <header className={`${shellHeaderBarClasses} sticky top-0 z-sticky w-full`}>
          <div data-ps-container className={PAGE_MEASURE}>
            {header}
          </div>
        </header>
      ) : null}
      <div
        data-ps-container
        className={`${PAGE_MEASURE} ${density === "pane" ? "flex flex-1 flex-col min-h-0" : ""}`.trim()}
      >
        <div data-ps-density={density} className={DENSITY[density]}>
          {children}
        </div>
      </div>
    </div>
  );
}
