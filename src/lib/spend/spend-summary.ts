// ═══════════════════════════════════════════════════════════════
// spend/spend-summary.ts · the read-model the console draws
//
// Composes the repository reads and the law into one answer: what has been
// spent, over each of the three periods, split by the three sources, plus the
// verdict against whatever figure the operator has or has not set.
//
// ── THE HONESTY PROBLEM, WHICH IS THE POINT OF THIS FILE ───────
//
// All three sources are recoverable, and the third one only became so recently.
//
//   agent      a `runs` row with a mission. Tokens in `usage_json`, model on
//              the mission. Fully recoverable.
//   composer   a `runs` row with a `composer_node_run_id` and no mission.
//              Tokens in `usage_json`, no model dimension, so it is priced at
//              model-cost's conservative DEFAULT_RATE. Recoverable SINCE
//              T-0058: this comment previously asserted that pricing as
//              though it were already true, and it was not. The reconciler
//              dropped every stage's usage on the floor (run-reconcile.ts
//              diverts composer runs before the write), so the rows arrived
//              with a NULL usage_json and the read below excluded all of
//              them. The row said $0.00 and read as a measurement.
//   research   a `research_runs` row. Recoverable SINCE MIGRATION 034 (T-0030),
//              which added the token columns; before that the engine called
//              `callLLM` directly and threw the usage away.
//
// The honesty problem did not go away with 034, it MOVED -- and 034 was not the
// end of it. T-0058 found the same class again in Composer, which 034 had not
// measured, and the lesson is that a comment claiming a source is priced is not
// evidence that anything writes its tokens. Every research run that predates
// the migration keeps NULL token columns, and NULL is not zero:
// it means the cost is unknown. Folding those in at zero would be a lie that
// looks like a number, and it would make the hard stop under-count by an amount
// nobody could see. So `foldResearch` counts them in the run count, skips them
// in the priced total, and reports them through `unmeasured`, which the UI is
// asserted to render.
//
// `SpendSourceRow.recorded` is the older expression of the same idea, from when
// the whole research source was unrecorded. Every row this file builds now sets
// it true, so the panel's "cost not recorded" branch is currently unreachable.
// It is kept rather than deleted because it is the contract a genuinely
// unrecorded FUTURE source would use, and because deleting it would leave the
// panel with no way to say "unknown" at all.
//
// Making Deep Research measurable is a real piece of work (a usage column, a
// change to the engine's LlmFn contract, and a migration) and it is NOT this
// task: the row said to compute spend from what is already recorded. It is
// written up here so the next person finds the gap described rather than
// discovering it from a number that was quietly wrong.
// ═══════════════════════════════════════════════════════════════

import { DEFAULT_RATE } from "@/lib/analytics/model-cost";

import {
  SPEND_PERIODS,
  evaluateSpend,
  formatUsd,
  periodLabel,
  periodPossessive,
  periodStart,
  type SpendPeriod,
  type SpendPolicy,
  type SpendVerdict,
} from "./spend-law";
import { readSpendPolicy } from "./spend-repository";
import {
  emptyWindow,
  recordedSpendSince,
  type SpendRateBasis,
  type SpendWindowSource,
} from "./spend-window";

// Module-private on purpose. Reachable structurally through the exported
// parent type, so a caller can still read the field; nothing imports the
// NAME, and an export nothing imports is what the widened knip gate exists
// to catch. Export it again the moment a caller genuinely needs to name it.
// Module-private on purpose. Reachable structurally through the exported
// parent type, so a caller can still read the field; nothing imports the
// NAME, and an export nothing imports is what the widened knip gate exists
// to catch. Export it again the moment a caller genuinely needs to name it.
interface SpendPeriodRow {
  period: SpendPeriod;
  label: string;
  /** The calendar instant the window opened, in SQLite format. */
  since: string;
  /** Sum of the RECORDED sources only. */
  totalUsd: number;
  sources: SpendWindowSource[];
  /**
   * Research runs in this period whose token columns are NULL.
   *
   * Carried on the row rather than recomputed by the caller, so the count and
   * the priced total come from ONE pass over the same rows. Two passes is how a
   * source row and the sentence describing it come to disagree, which is the
   * defect T-0037 and T-0042 spent their whole scope removing elsewhere.
   */
  unrecordedResearchRuns: number;
  /**
   * What this period's money was priced from: a rate on file, or the fallback.
   *
   * Per period, because each tile draws its own figure and a month can be a
   * guess while a day is not.
   */
  basis: SpendRateBasis;
  /**
   * THIS period's admission that part of THIS period's figure is a guess, or
   * null when none of it was.
   *
   * On the row rather than only on the summary, because the panel marks every
   * period whose basis was estimated and used to point all three marks at one
   * sentence built from the budget period alone. That went wrong twice. A
   * non-budget period could be marked while the sentence did not exist at all
   * (the ISO week opens on a Monday, so early in most months the week window
   * reaches back past the month boundary and holds spend the month does not),
   * and where the sentence did exist its dollar figure was the budget period's,
   * not the marked tile's. A mark and its explanation are one thing now, and
   * they are computed from one basis.
   */
  estimateNote: string | null;
}

export interface SpendSummary {
  /** day, week, month, always all three, so the console needs one request. */
  periods: SpendPeriodRow[];
  policy: SpendPolicy;
  /** The period the figure covers (meaningless while the figure is null). */
  budgetPeriod: SpendPeriod;
  /** Recorded spend inside that period. */
  budgetSpentUsd: number;
  verdict: SpendVerdict;
  /** What the totals above exclude, in sentences. Empty when they exclude nothing. */
  unmeasured: string[];
  /**
   * How much of the budget period's figure is a guess, in one sentence, or null
   * when every figure came from a rate the product has on file.
   *
   * A sibling of `unmeasured` and deliberately not folded into it: that list is
   * about money left OUT of the total, this is about money that is IN it but
   * priced at a fallback. Both are honesty; they are not the same admission.
   *
   * It is the budget period's own `estimateNote`, taken from the row rather
   * than computed a second time, so the prose under the source rows and the
   * mark on the tile above them cannot say different things about the same
   * money. The sentence names its period, because three tiles share one screen.
   */
  estimateNote: string | null;
  generatedAt: string;
}

function safeRead<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function periodRow(period: SpendPeriod, nowIso: string): SpendPeriodRow {
  const since = periodStart(period, nowIso);
  // The one window helper, which the hard stop also calls, so the console and
  // the stop cannot total different money again (T-0108, D104). The summary
  // degrades to zeros; the guard does not, and must not.
  const w = safeRead(() => recordedSpendSince(since), emptyWindow(since));

  return {
    period,
    label: periodLabel(period),
    since,
    totalUsd: w.totalUsd,
    sources: w.sources,
    unrecordedResearchRuns: w.unrecordedResearchRuns,
    basis: w.basis,
    // Written here, beside the basis it describes, so the two are one read.
    // The panel can then mark a tile and explain the mark from the same row.
    estimateNote: estimateNoteFor(period, w.basis),
  };
}

/** "a", "a and b", "a, b and c", then "a, b, c and 2 more". */
function nameList(items: string[], cap = 3): string {
  const shown = items.slice(0, cap);
  const rest = items.length - shown.length;
  if (rest > 0) shown.push(`${rest} more`);
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/**
 * The sentence that admits which part of a period's figure is a guess.
 *
 * The rate table is small and this install may not be in it, so the honest
 * answer is not a better number: it is the same number, plus the reason it is
 * an estimate and somewhere real to check. Naming the models matters, because
 * "add a price for minimax-m2" is something the operator can act on, whereas
 * "some rates are missing" is not.
 *
 * It takes the PERIOD as well as the basis, and every sentence it builds names
 * that period. The first version said "this period's total" and was called once
 * for the budget period while three tiles pointed at the result, so a $12.00
 * month tile could sit above a note about $4.00 with nothing to tell the reader
 * they were different windows.
 */
function estimateNoteFor(period: SpendPeriod, basis: SpendRateBasis): string | null {
  if (basis.estimatedUsd <= 0) return null;

  const reasons: string[] = [];
  if (basis.unknownModels.length > 0) {
    reasons.push(`there is no price on file for ${nameList(basis.unknownModels)}`);
  }
  if (basis.runsWithoutModel > 0) {
    const n = basis.runsWithoutModel;
    reasons.push(`${n} run${n === 1 ? "" : "s"} recorded no model to price against`);
  }
  // Belt and braces: money was estimated, so there is always a reason for it.
  if (reasons.length === 0) reasons.push("no rate could be looked up");

  const reason = reasons.join(", and ");
  const whose = periodPossessive(period);
  const share =
    basis.knownUsd <= 0
      ? `Every figure in ${whose} total is an estimate.`
      : // Below a cent, the amount says nothing useful and reads as a bug.
        basis.estimatedUsd < 0.005
        ? `Part of ${whose} total is an estimate.`
        : `${formatUsd(basis.estimatedUsd)} of ${whose} total is an estimate.`;

  return (
    `${share} ${reason[0].toUpperCase()}${reason.slice(1)}, so they are priced at a ` +
    `fallback of ${formatUsd(DEFAULT_RATE.input)} per million input tokens and ` +
    `${formatUsd(DEFAULT_RATE.output)} per million output tokens. Check your ` +
    `provider's own billing page for what you were actually charged.`
  );
}

/**
 * The whole console answer.
 *
 * `nowIso` is injectable so the period arithmetic is testable; it defaults to
 * the real clock. Every read is wrapped defensively, so a database that is
 * mid-migration yields zeros rather than a broken page. The GUARD does NOT
 * share that posture, and must not: see spend-guard.ts.
 */
export function getSpendSummary(nowIso: string = new Date().toISOString()): SpendSummary {
  const policy = safeRead(readSpendPolicy, {
    limitUsd: null,
    period: "month" as SpendPeriod,
    hardStop: false,
    updatedAt: "",
  });

  const periods = SPEND_PERIODS.map((p) => periodRow(p, nowIso));
  const budget = periods.find((p) => p.period === policy.period) ?? periods[periods.length - 1];

  const unmeasured: string[] = [];
  // Only the runs that genuinely carry no counts.
  //
  // This used to say the runs "predate token recording" and that the list would
  // empty itself as pre-034 runs aged out. Both were false. The trigger is
  // purely `promptTokens === null` with no date comparison anywhere, so a run
  // created today with no usage was reported as predating the feature. And
  // until T-0068 EVERY research run landed with null usage, because llm.ts
  // handed the accumulator a snake_case object it read camelCase off, so the
  // list could never empty. The wording now describes this run's data rather
  // than making a claim about history it cannot check.
  const unrecorded = budget.unrecordedResearchRuns;
  if (unrecorded > 0) {
    unmeasured.push(
      `${unrecorded} Deep Research run${unrecorded === 1 ? "" : "s"} in this period ` +
        `recorded no token usage, so ` +
        `${unrecorded === 1 ? "its cost is" : "their costs are"} not counted in the ` +
        `totals above.`,
    );
  }

  return {
    periods,
    policy,
    budgetPeriod: policy.period,
    budgetSpentUsd: budget.totalUsd,
    verdict: evaluateSpend(policy, budget.totalUsd),
    unmeasured,
    // Taken from the row, never recomputed. Two passes over the same basis is
    // exactly how a figure and the sentence beside it came to disagree.
    estimateNote: budget.estimateNote,
    generatedAt: nowIso,
  };
}
