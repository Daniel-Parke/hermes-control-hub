// ═══════════════════════════════════════════════════════════════
// Page Header Component
// ═══════════════════════════════════════════════════════════════

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { AccentColor } from "@/types/console";
import { shellHeaderBarClasses, iconColorMap } from "@/lib/theme";
import { StatusDot } from "@/components/ui/Card";
import PageTitle, { useRegistryTitle } from "@/components/layout/PageTitle";
import HelpLink from "@/components/help/HelpLink";

interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  /**
   * The page's name. Omit it and the header reads the registry's label for
   * the current path, which is what keeps the rail entry, the h1 and the tab
   * title one word (T-0097, D55). Pass one only when the header names a thing
   * rather than a place.
   */
  title?: string;
  subtitle?: string;
  color?: AccentColor;
  backHref?: string;
  backLabel?: string;
  /** When true, show only the back arrow (no BACK label). */
  backIconOnly?: boolean;
  status?: "online" | "warning" | "error" | "idle";
  actions?: React.ReactNode;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  color = "cyan",
  backHref,
  backLabel = "BACK",
  backIconOnly = false,
  status,
  actions,
}: PageHeaderProps) {
  const resolved = useRegistryTitle(title);
  return (
    <header
      // flex-wrap, because on a phone the actions alone can be wider than the
      // bar: Logs measures 388px of pickers and buttons inside 390px. With
      // nothing to share, the title group was rendering 0px wide. Wrapping puts
      // the actions on a second row instead of erasing the page's own name.
      className={`${shellHeaderBarClasses} sticky top-0 z-30 flex-wrap justify-between gap-4 py-3 w-full`}
    >
      <PageTitle title={resolved} />
      {/* flex-1, not just min-w-0: min-w-0 lets this group shrink past its
          content, and with the actions marked shrink-0 there was nothing to
          stop it reaching zero. On a phone the busiest headers rendered
          their h1 0px wide. Growing claims the leftover space instead, and
          the truncate on the h1 handles what is left. */}
      <div className="flex flex-1 items-center gap-4 min-w-0">
        {backHref && (
          <>
            <Link
              href={backHref}
              className={`flex items-center text-ps-text-muted hover:text-white transition-colors shrink-0 ${
                backIconOnly ? "" : "gap-2"
              }`}
              // Always named, because the label is now hidden below sm and a
              // link whose text disappears at a breakpoint would otherwise be
              // an unnamed arrow on a phone.
              aria-label={backLabel}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {/* Hidden below sm, not removed: on a 390px screen the page's own
                  name is worth more than the word for where you came from, and
                  the arrow still says it. The aria-label below keeps the link
                  named for anyone not reading pixels. */}
              {!backIconOnly && (
                <span className="hidden sm:inline text-sm font-mono">{backLabel}</span>
              )}
            </Link>
            {!backIconOnly && <div className="hidden sm:block w-px h-6 bg-white/20 shrink-0" />}
          </>
        )}
        {/* Grows for the same reason its parent does: the back link and the
            divider beside it are shrink-0, so without this the title is
            handed whatever is left, which on a phone was nothing. */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[color]}`} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 truncate">
              {resolved}
              {status && <StatusDot status={status} pulse />}
            </h1>
            {subtitle && (
              <p className="text-xs text-ps-text-muted font-mono truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
      {/*
        The ? is here rather than on each page, and the wrapper is always
        rendered rather than conditional on `actions`, so a page that passes no
        actions is not also a page with no way into its guide. There is no prop
        to opt out with: an opt-out is how a screen quietly loses its guide.
      */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <HelpLink />
        {actions}
      </div>
    </header>
  );
}
