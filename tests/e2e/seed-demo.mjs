/**
 * Representative content for the documentation screenshots.
 *
 * Every screen in the guides gets photographed, and a screen photographed empty
 * teaches a reader nothing except that the product looks empty. So this creates
 * a small, plausible working set through the product's OWN public routes -- not
 * by writing rows into the database, which would let a screenshot show a state
 * the product cannot actually reach.
 *
 * It is deliberately modest. A dashboard with four hundred missions on it is as
 * unhelpful as one with none: the reader is trying to recognise the shape of the
 * screen, not to admire a workload. Names are boring on purpose, because a
 * screenshot full of jokes dates badly and reads as unserious in a manual.
 *
 * Every call is best-effort. A screen whose backing feature is switched off on
 * this install (the Composer behind its flag, memory with no provider) should
 * still be photographed as the reader would find it, so a failure here is data
 * about the install rather than a reason to stop.
 */

const MISSIONS = [
  {
    name: "Summarise the week's commits",
    instruction:
      "Read this week's commits on the main branch and write a short summary of what changed, grouped by area.",
  },
  {
    name: "Check the dependency licences",
    instruction: "List every direct dependency and its licence, and flag anything that is not permissive.",
  },
  {
    name: "Draft the release notes",
    instruction: "Turn the changelog's unreleased section into release notes a non-technical reader can follow.",
  },
];

const SCRIPTS = [
  {
    name: "disk-usage.sh",
    content: "#!/usr/bin/env bash\n# Report the ten largest directories under $HOME.\ndu -h -d 2 \"$HOME\" | sort -rh | head -n 10\n",
  },
  {
    name: "backup-check.mjs",
    content:
      "// Report how old the most recent database backup is.\nimport { readdirSync, statSync } from \"node:fs\";\n\nconst dir = process.env.PS_BACKUP_DIR ?? \".\";\nconst backups = readdirSync(dir).filter((f) => f.endsWith(\".bak\"));\nconsole.log(`${backups.length} backup(s) in ${dir}`);\n",
  },
];

/**
 * POST through the product's own API, swallowing anything that goes wrong.
 *
 * `request` is Playwright's fixture, so it already carries the harness's bearer
 * token and base URL.
 */
async function post(request, path, data) {
  try {
    const res = await request.post(path, { data });
    return res.ok() ? await res.json().catch(() => null) : null;
  } catch {
    return null;
  }
}

/**
 * Seed the demo content and report what landed.
 *
 * Returns the ids worth knowing about downstream (a mission to open, a story to
 * read), so a shot that wants a detail page has something real to point at.
 */
export async function seedDemo(request) {
  const made = { missions: [], scripts: [], story: null };

  // Missions, saved rather than dispatched: a screenshot should not depend on a
  // gateway answering, and a board of drafts is the state a new reader will
  // recognise from their own first afternoon.
  for (const mission of MISSIONS) {
    const created = await post(request, "/api/missions", {
      action: "dispatch",
      dispatchMode: "save",
      ...mission,
    });
    const id = created?.data?.mission?.id ?? created?.data?.id ?? null;
    if (id) made.missions.push(id);
  }

  for (const script of SCRIPTS) {
    const saved = await post(request, "/api/scripts", { action: "save", ...script });
    if (saved) made.scripts.push(script.name);
  }

  // One story, so the Rec Room screens are not photographed empty. No chapter is
  // generated: that would call a model and cost money to take a picture.
  const story = await post(request, "/api/recroom/stories", {
    title: "The Lighthouse at Ardnamurchan",
    premise: "A keeper discovers the light has been answering someone.",
    genre: "mystery",
  });
  made.story = story?.data?.story?.id ?? story?.data?.id ?? null;

  return made;
}

export { MISSIONS, SCRIPTS };
