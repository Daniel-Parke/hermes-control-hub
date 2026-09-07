// ═══════════════════════════════════════════════════════════════
// memory-error-copy.ts: the sentences the memory surface says when it cannot
// serve a request, in one place because three surfaces read them
//
// The three readers are the store-a-memory toast, the health banner inside the
// memory provider card, and the Memory row of the dashboard's subsystems
// panel. One string reaches all three, so a sentence that is only true in one
// of them is a bug in the other two.
//
// TWO RULES, both learned the hard way.
//
// NAME AN ACTION, NOT A DESTINATION. The copy used to say "in the memory
// provider card at the top of the Memory page". HealthBanner is rendered
// INSIDE that card (MemoryProviderSettings.tsx is its only call site), so the
// banner told the reader to go where they were already standing, and named
// nothing to do once there. Naming the controls -- Host, Port, Save -- works
// from every reader: the one in the card can see them, the one on the
// dashboard learns which page carries them.
//
// PROMISE ONLY CONTROLS THAT EXIST. It also said "Choose a different provider".
// The card holds Host, Port, Bank, Test connection and Save, and Save posts
// `type: current.type` -- the same provider it loaded. There is no provider
// chooser in src/components/memory, and config-schema.ts renders
// `memory.provider` read-only. So the product cannot change provider type, and
// copy that says otherwise sends the reader hunting for a control that is not
// there. A state with no remedy says so plainly instead of inventing one.
// ═══════════════════════════════════════════════════════════════

import type { MemoryProviderType } from "./memory-providers/types";

/**
 * The openings of the two notices below, as constants, because the health
 * banner has to RECOGNISE them: a sentence PatterStage wrote about there being
 * no provider must not be reprinted as "Hindsight: <sentence>".
 */
const NO_PROVIDER_STEM = "No memory provider is configured";
const NO_CLIENT_STEM = "PatterStage has no client for";

/**
 * What happened, then what to do about it, for a provider that cannot serve
 * anything.
 *
 * Both halves matter. "No memory provider is configured." was true and
 * useless: it named no next action, and it reached a person who had just
 * pressed Store, not one who was querying.
 *
 * The `none` branch names Host, Port and Save because pressing Save on that
 * card writes `enabled: true` for the active row, which is exactly what turns
 * memory back on. The no-client branch names no remedy because the product has
 * none: what is missing is a PatterStage client, and nothing on the Memory
 * page can supply one.
 */
export function memoryUnavailableMessage(type: MemoryProviderType): string {
  return type === "none"
    ? `${NO_PROVIDER_STEM}, so there is nothing to store or search. ` +
        "Set Host and Port on the Memory page and press Save to switch one on."
    : `${NO_CLIENT_STEM} the '${type}' memory provider yet, so it cannot store ` +
        "or search from here. Nothing on the agent side is affected: what is " +
        "missing is a PatterStage client, not the memory itself.";
}

/** Is this string one of the notices above, rather than a provider's own words? */
export function isMemoryUnavailableMessage(text: string): boolean {
  return text.startsWith(NO_PROVIDER_STEM) || text.startsWith(NO_CLIENT_STEM);
}

/**
 * What a transport failure looks like on the wire. Nothing listening means the
 * health route answers `{ available: false, error: "fetch failed" }` and the
 * store route publishes the same phrasing with undici's cause appended, and
 * "fetch failed" is Node's phrasing, not an instruction to anybody.
 *
 * This is a substring heuristic, and it is deliberately the ONE heuristic: the
 * banner and the store route share it so the two surfaces cannot describe the
 * same outage in different words.
 */
const TRANSPORT_ERRORS = ["fetch failed", "ECONNREFUSED", "Connection refused", "ETIMEDOUT"];

/** Did the request fail to reach a provider at all? */
export function isMemoryTransportFailure(text: string): boolean {
  return TRANSPORT_ERRORS.some((token) => text.includes(token));
}

/**
 * The commonest failure in this product: a provider is configured and is not
 * running.
 *
 * It says the two things that fix it, in the order a person tries them. It no
 * longer says "configured above": the banner renders ABOVE the Host and Port
 * fields, so "above" pointed at the heading, and in a toast it pointed at
 * nothing at all.
 *
 * The last clause is not filler. An install with no memory provider is a
 * supported state, not a fault, and a first-run reader needs telling that the
 * rest of the product is fine.
 */
export const MEMORY_NOT_ANSWERING =
  "No memory provider is answering at the configured host and port. " +
  "Start your memory provider, or correct Host and Port on the Memory page and press Save. " +
  "PatterStage works without one; memory stays empty until a provider is running.";

/**
 * Translate a raw failure into something a person can act on, or leave it
 * alone. A provider that explained itself is always quoted verbatim; only a
 * bare transport failure is replaced.
 */
export function memoryFailureMessage(raw: string): string {
  return isMemoryTransportFailure(raw) ? MEMORY_NOT_ANSWERING : raw;
}
