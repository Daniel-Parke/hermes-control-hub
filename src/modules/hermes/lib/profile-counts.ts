// ═══════════════════════════════════════════════════════════════
// profile-counts.ts: "how much is switched on for this profile?"
//
// Split out of profile-sync.ts, where these two sat among the disk
// operations. The toolsets count answers from the DATABASE alone; the
// skills count reads the agent's skills tree as well, and has to, because
// the set it is counting is the set the Skills page lists and that page
// merges the catalogue with the tree. Counting the catalogue on its own
// described an install with seventy-eight usable skills as having four.
//
// Nothing here writes. Neither of these is part of the sync family: the
// disk is read to answer a question, never to change what is on it.
// ═══════════════════════════════════════════════════════════════

import { getProfile, hydratePlatformToolsetsForSlug } from "./profiles-repository";
import { unionToolsetsFromPlatforms } from "./toolset-unify";
import {
  listCatalogSkillKeys,
  resolveEffectiveDisabledSkills,
} from "./effective-disabled-skills";

/** Count the toolsets this profile enables, unioned across platforms. */
export function countProfileToolsets(slug: string): number {
  const hydrated = hydratePlatformToolsetsForSlug(slug === "default" ? "default" : slug);
  if (!hydrated) return 0;
  return unionToolsetsFromPlatforms(hydrated.toolsets).length;
}

/**
 * How many skills this profile may actually use.
 *
 * COUNT THE SAME SET THE SKILLS PAGE LISTS, which is the whole correction
 * here. This used to subtract the profile's denylist from `countSkills()`, the
 * number of rows in the SQLite catalogue, while GET /api/skills lists the
 * catalogue UNION the skills in the agent's tree. On an install with four
 * seeded rows and seventy-four skills on disk, a card read "4 skills" beside a
 * page listing 78.
 *
 * The subtraction made it worse than a fixed under-count. Every key an
 * operator switches off joins the denylist, disk-only keys included, so each
 * of those seventy-four took one off a base that never held it: four toggles
 * and the card read "0 skills" with seventy-four still enabled, and switching
 * them back on left it pinned at zero until the denylist fell below four. The
 * number moved against the label. Counting the union, minus the effective
 * denylist, makes the card and the page it links to agree by construction.
 *
 * The catalogue is read once and handed to the denylist resolution, which
 * would otherwise walk the skills tree a second time for every profile.
 *
 * Counting more than one profile? Use `createProfileSkillsCounter` and keep
 * the catalogue between them.
 */
export function countProfileSkills(slug: string): number {
  return createProfileSkillsCounter()(slug);
}

/**
 * The same count, for a batch of profiles, holding the catalogue between them.
 *
 * The catalogue is profile-INDEPENDENT: `skillsRootForProfile()` takes no
 * argument and always answers the default root, so a loop over P profiles
 * calling `countProfileSkills` did P byte-identical recursive walks of one
 * skills tree and P reads of the SQLite catalogue. Only the denylist differs
 * per profile, and that read stays inside the returned function. Both callers
 * that count a whole population in one pass, GET /api/agent/profiles and the
 * Agents-page performance strip, take their number from here.
 *
 * Deliberately not memoised across calls: an operator toggling a skill must
 * see the next read move, so the catalogue lives no longer than the batch.
 */
export function createProfileSkillsCounter(): (slug: string) => number {
  const catalogKeys = listCatalogSkillKeys();

  return (slug: string): number => {
    // Kept ahead of the denylist read: getDisabledSkills answers [] for a
    // profile with no row, which would report the whole catalogue as available
    // to a profile that does not exist.
    if (slug !== "default" && !getProfile(slug)) return 0;

    const disabled = resolveEffectiveDisabledSkills(slug, { catalogKeys });
    return catalogKeys.filter((key) => !disabled.has(key)).length;
  };
}
