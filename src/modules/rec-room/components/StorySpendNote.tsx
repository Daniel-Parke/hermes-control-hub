// ── StorySpendNote — what this story has cost, said quietly, in the reader.
//
// Story generation calls a paid model. The spend has been recorded since
// T-0108 and totalled in the spend console ever since, and the Rec Room never
// mentioned it: not before the button, not while it ran, not afterwards. A
// first-time operator's first news of the cost was the provider bill.
//
// TWO RULES SHAPE THIS, and they pull against each other.
//
//   IT IS ALWAYS THERE. Including at zero. A disclosure that appears only once
//   money has been spent is a disclosure that arrives after the surprise.
//
//   IT IS NEVER A SCARE. One line of small text beside the chapter dots. No
//   modal, no confirm, no red, nothing to dismiss and nothing in the way of
//   the next chapter.
//
// The figure comes from `recordedSpendForStory`, which is the console's own
// fold, so this line and the Story Weaver row in the spend console are one
// number. Never compute a second one here.

"use client";

import { formatUsd } from "@/lib/spend/spend-law";
import type { SpendWindowSource } from "@/lib/spend/spend-window";

/**
 * The same sentence the create page uses, so both say it the same way.
 *
 * It does NOT say "published per-model rates", and must not. A story run
 * records no model -- createSpendRun stores the story and the source and
 * nothing to price against -- so every story figure is the fallback rate, not
 * a published one, always rather than occasionally. The spend console had that
 * same claim removed this round for the weaker version of the same reason, and
 * carries a comment asking for it not to be restored. This is the number that
 * console shows; it has to be the description that console gives.
 */
const HOW_ESTIMATED =
  "Estimated from the token usage recorded for this story. Chapters record no model to price against, so this uses a fallback rate: treat it as a rough guide, not an invoice. Insights shows every source together.";

export interface StorySpendNoteProps {
  /** The story's recorded spend, or null while it is unknown. */
  spend: SpendWindowSource | null;
}

export default function StorySpendNote({ spend }: StorySpendNoteProps) {
  // Unknown is not zero, so a figure that could not be read says nothing at
  // all rather than drawing a confident $0.00 the console would contradict.
  if (!spend || !spend.recorded) return null;

  const calls = spend.runs;
  const text =
    calls === 0
      ? "Writing a chapter calls a paid model. Nothing spent on this story yet."
      : `This story so far: ${formatUsd(spend.costUsd ?? 0)} (${calls} model call${calls === 1 ? "" : "s"})`;

  return (
    <span
      data-testid="story-spend-note"
      title={HOW_ESTIMATED}
      className="text-xs leading-none text-ps-text-faint"
    >
      {text}
    </span>
  );
}
