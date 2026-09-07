// ═══════════════════════════════════════════════════════════════
// healthBannerMessage — build the Hindsight "not responding" message
// ═══════════════════════════════════════════════════════════════
//
// HealthBanner.tsx had a 6-line inline ternary that decided the
// banner message based on three `health` fields:
//
//   1. If `health.error` mentions "Redis" → "Redis is not running..."
//   2. Else if `health.message` is set → "Hindsight <mode>: <message>"
//   3. Else → "Hindsight <mode>: <error or 'not responding'>"
//
// The 3-branch decision is small but worth extracting for two reasons:
//   1. **Testability** — the Redis detection is a substring heuristic
//      that can match partial substrings ("refused to start" contains
//      nothing Redis-related, but "RedisConnectionError" should match).
//      Unit tests pin down the exact matching behaviour so a future
//      tightening to word-boundary matches is a deliberate change.
//   2. **The HealthState shape is reused** — when a future consumer
//      (e.g. a Hindsight settings page) needs the same banner, the
//      helper is the single source of truth.

import {
  MEMORY_NOT_ANSWERING,
  isMemoryTransportFailure,
  isMemoryUnavailableMessage,
} from "@/lib/memory/memory-error-copy";
import type { HealthState } from "@/components/memory/hindsight/types";

/** Substring token that triggers the "Redis is not running" branch. */
const REDIS_TOKEN = "Redis";

/** Fallback message when neither `error` nor `message` is set. */
const NOT_RESPONDING = "not responding";

/**
 * The transport-failure list and its plain-English replacement moved to
 * @/lib/memory/memory-error-copy. The store route publishes the same sentence
 * for the same outage, and a second copy of the rule would have let the banner
 * and the toast describe one stopped provider in two different ways.
 */

/**
 * "Hindsight <mode>", or plain "Hindsight" when the payload carried no mode.
 * An unreachable provider answers without one, which used to render the literal
 * string "Hindsight undefined:".
 */
function label(mode: string | undefined): string {
  return mode ? `Hindsight ${mode}` : "Hindsight";
}

/**
 * Resolve the banner message for a `health: HealthState` payload.
 *
 *   0. the error is PatterStage's own no-provider notice → verbatim
 *   1. `health.error?.includes("Redis")` → "Redis is not running.
 *      Start Redis to enable memory features: redis-server"
 *   2. `health.message` is set → "Hindsight <mode>: <message>"
 *   3. the error is a bare transport failure → the plain-English
 *      "nothing is answering, and that is survivable" sentence
 *   4. otherwise → "Hindsight <mode>: <error || 'not responding'>"
 *
 * The order matters: case 1 wins over case 2 because a Redis-related
 * error often comes with a generic "Connection refused" message and we
 * want the actionable Redis hint to surface. Case 3 sits below the
 * message branch so a provider that explains itself is always quoted
 * verbatim, and only Node's own "fetch failed" gets translated.
 *
 * Case 0 sits above all of them because the label is a lie for it. Those
 * notices are PatterStage saying there is no provider, or no client for the
 * one selected; stamping "Hindsight:" on the front of a sentence about there
 * being no Hindsight is the contradiction this branch exists to stop, and the
 * notice is already a complete instruction that needs no prefix.
 */
export function healthBannerMessage(health: HealthState): string {
  if (health.error && isMemoryUnavailableMessage(health.error)) {
    return health.error;
  }
  if (health.error?.includes(REDIS_TOKEN)) {
    return "Redis is not running. Start Redis to enable memory features: redis-server";
  }
  if (health.message) {
    return `${label(health.mode)}: ${health.message}`;
  }
  if (health.error && isMemoryTransportFailure(health.error)) {
    return MEMORY_NOT_ANSWERING;
  }
  return `${label(health.mode)}: ${health.error || NOT_RESPONDING}`;
}
