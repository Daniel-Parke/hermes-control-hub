// ═══════════════════════════════════════════════════════════════
// schedule/interval-bounds.ts: how often a schedule is allowed to fire
//
// `every 0m` parses cleanly as an interval of zero minutes, so every write
// path stored it and computeNextRun answered "the instant you asked" for it
// forever: the row was due on every tick, and every tick dispatched a real
// agent run at a paid provider. Nothing warned anybody. The mirror image
// (`every 999999999d`) left the Date range, so the advance threw AFTER the
// dispatch and the row never left the due set either.
//
// Only intervals are judged here. Cron is the other half of the surface and
// cannot express either end: nextCronAfter steps in whole minutes, so
// `* * * * *` is already the fastest thing cron can say, and its search gives
// up after a year, which is the slowest.
// ═══════════════════════════════════════════════════════════════

import { parseSchedule } from "./parse-schedule";

/**
 * The shortest gap allowed between two firings of one schedule.
 *
 * A minute, because a firing is not free: a mission schedule dispatches a real
 * agent run at a paid provider, and a script schedule starts a host process.
 * Anything faster than once a minute buys nothing an operator could actually
 * consume and costs money on a loop. It is also exactly where cron already
 * stops, so this floor refuses only what the cron half of the surface could
 * never have written in the first place.
 */
export const MIN_SCHEDULE_INTERVAL_MINUTES = 1;

/**
 * The longest gap that can be stored, in minutes.
 *
 * 366 days, the same horizon nextCronAfter searches, so the two halves of the
 * surface agree on what "so rare it is certainly a typo" means. The ceiling is
 * not tidiness: past roughly 273 million days the millisecond arithmetic leaves
 * the Date range, `new Date(...)` is an Invalid Date, and `.toISOString()` on
 * one throws. That threw on the write path as a 500 with no explanation, and on
 * the tick AFTER the dispatch, which left the row due and firing on every tick.
 */
export const MAX_SCHEDULE_INTERVAL_MINUTES = 366 * 24 * 60;

/** MAX expressed in days, for the refusals below. */
const MAX_SCHEDULE_INTERVAL_DAYS = MAX_SCHEDULE_INTERVAL_MINUTES / (24 * 60);

/**
 * May a schedule repeat this often?
 *
 * The rule itself, as one comparison, so that computeNextRun (which has the
 * parsed minutes already in hand and needs no message) and the two refusals
 * below cannot drift apart on what is allowed.
 */
export function intervalMinutesAllowed(minutes: number): boolean {
  return minutes >= MIN_SCHEDULE_INTERVAL_MINUTES && minutes <= MAX_SCHEDULE_INTERVAL_MINUTES;
}

/** Which bound an interval breaks, if either. */
type IntervalBreach = "too often" | "too rarely";

/**
 * The one judgement, so the sentence shown on a write and the few words shown
 * on a stopped schedule row can never disagree about what is allowed.
 *
 * Anything that is not an interval (cron, a one-shot, or something
 * parseSchedule cannot read at all) is not this module's business and comes
 * back null: the parse check and the never-fires check already judge those, and
 * a guard that answered for them would refuse perfectly good cron.
 */
function intervalBreach(raw: string): IntervalBreach | null {
  const parsed = parseSchedule(raw);
  if (parsed.kind !== "interval" || intervalMinutesAllowed(parsed.minutes)) return null;
  return parsed.minutes < MIN_SCHEDULE_INTERVAL_MINUTES ? "too often" : "too rarely";
}

/**
 * Is this schedule's interval outside what may be stored, and if so, why not?
 *
 * Returns the sentence to show the operator, or null when there is nothing to
 * refuse. Used at every write path, and by the picker so the refusal arrives
 * before the request rather than after it.
 */
export function scheduleIntervalProblem(raw: string): string | null {
  const breach = intervalBreach(raw);
  if (!breach) return null;
  const shown = raw.trim();
  if (breach === "too often") {
    return (
      // The reason is deliberately NOT "because it starts a paid agent run":
      // this same refusal serves script schedules, which start a host process
      // and cost nothing at a provider. The floor exists for both, so the
      // sentence has to be true of both. The tick's own status line has always
      // been kind-agnostic; this is now consistent with it.
      `Schedule "${shown}" repeats too often. The shortest gap between runs is ` +
      `${MIN_SCHEDULE_INTERVAL_MINUTES} minute, because each run starts real work ` +
      `that has to finish. Try "every 5m".`
    );
  }
  return (
    `Schedule "${shown}" repeats too rarely. The longest gap between runs is ` +
    `${MAX_SCHEDULE_INTERVAL_DAYS} days. Use a smaller number, or a cron schedule such as ` +
    `"0 9 1 1 *" to run once a year.`
  );
}

/**
 * The same judgement in the few words a schedule row's status has space for.
 *
 * The scheduler tick writes this on a stored row it refuses to fire, and the
 * missions and schedules lists show it verbatim, so it has to say what happened
 * and what would fix it inside one line.
 */
export function scheduleIntervalStatus(raw: string): string | null {
  const breach = intervalBreach(raw);
  if (!breach) return null;
  if (breach === "too often") {
    return `stopped: repeats too often, the minimum is every ${MIN_SCHEDULE_INTERVAL_MINUTES} minute`;
  }
  return `stopped: repeats too rarely, the maximum is every ${MAX_SCHEDULE_INTERVAL_DAYS} days`;
}
