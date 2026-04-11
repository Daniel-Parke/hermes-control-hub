// ═══════════════════════════════════════════════════════════════
// Story Weaver — LLM Prompt Templates
// ═══════════════════════════════════════════════════════════════
// These prompts are the creative engine behind Story Weaver.
// Quality of these prompts = quality of generated stories.

/**
 * Combined plan + first chapter prompt.
 * Generates BOTH the story plan and Chapter 1 in a single LLM call.
 * This reduces initial wait time from 2 calls to 1.
 */
export const PLAN_AND_CHAPTER_PROMPT = `You are a master novelist creating a new story. You will produce TWO things in sequence:

PART 1: STORY PLAN (JSON format)
Create a detailed story plan with:
- Title
- One-paragraph premise/theme
- Chapter-by-chapter breakdown (key events, emotional beats, OPTIONAL DEVIATION HOOKS for future user steering)
- Character consistency notes (traits, speech patterns, relationships)
- World-building rules (established facts that must remain consistent)

Deviation hooks are pre-planned moments where the story could branch — "plot forks" the user can activate later.

PART 2: CHAPTER 1 (prose, 800-1500 words)
Write the first chapter using the plan above. This chapter MUST:
- Hook the reader immediately
- Establish the setting, tone, and main character(s)
- Set up the central conflict or mystery
- End with momentum — the reader must want Chapter 2
- Be vivid, sensory, and emotionally engaging
- Follow the plan's key events for Chapter 1

CONSISTENCY CHECKLIST:
- Character names spelled consistently
- Character speech patterns match their established traits
- Tone and mood match the planned style
- POV is consistent throughout
- No contradictions with the planned world rules

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

===PLAN===
{"title":"...","premise":"...","chapters":[{"title":"...","key_events":["..."],"emotional_beat":"...","deviation_hooks":["..."]}],"character_notes":["..."],"world_rules":["..."]}

===CHAPTER 1===
[Your chapter prose here — 800-1500 words, no headers or meta-commentary]`;

/**
 * Chapter generation prompt.
 * Used for all chapters after the first.
 * Includes the story plan and previous chapters for continuity.
 */
export const CHAPTER_PROMPT = `You are a master novelist writing the next chapter of a story.

You will receive:
1. The complete story plan
2. Previous chapters text (for continuity)
3. Which chapter number to write
4. Optional user direction for this chapter

CONSISTENCY CHECKLIST (verify before writing):
- Character names are spelled consistently with previous chapters
- Character speech patterns match established traits
- No universe-breaking plotholes (world rules are respected)
- Tone and mood match the story's established style
- Timeline is coherent (no contradictions with previous events)
- POV remains consistent throughout

RULES:
1. Write 800-1500 words — this is a real book chapter with its own arc
2. Open with a hook, develop the chapter's key events, end with momentum
3. Follow the plan's key events but add rich texture and vivid detail
4. Show, don't tell. Use sensory details. Dialogue should feel natural.
5. If userDirection is provided, weave it in naturally — don't force it
6. End at a natural chapter break — resolution or compelling hook
7. No meta-commentary, no "Chapter X begins" headers — just story text

Return ONLY the chapter text. Pure prose, nothing else.`;

/**
 * Story summary prompt.
 * Compresses previous chapters into a rolling summary for context.
 */
export const SUMMARY_PROMPT = `Summarize the following story content in 3-5 concise sentences.
Focus on: key plot events, character developments, current situation.
This will be used as context for generating the next chapter.

Return ONLY the summary text. No formatting, no labels.`;

/**
 * Get the appropriate system prompt for a Story Weaver phase.
 */
export function getStoryPrompt(phase: "plan" | "chapter" | "summary"): string {
  const prompts: Record<string, string> = {
    plan: PLAN_AND_CHAPTER_PROMPT,
    chapter: CHAPTER_PROMPT,
    summary: SUMMARY_PROMPT,
  };
  return prompts[phase] || CHAPTER_PROMPT;
}

// ── Fun Status Messages ──────────────────────────────────────

export const LOADING_MESSAGES = [
  "The muse is visiting...",
  "Weaving plot threads...",
  "Developing characters...",
  "Building your world...",
  "The story writes itself... almost...",
  "Consulting the narrative oracle...",
  "Ink meets parchment...",
  "Spinning tales of wonder...",
];

export const CHAPTER_STATUSES: Record<string, string> = {
  pending: "Waiting for its moment...",
  writing: "The muse is visiting...",
  complete: "The ink is still wet.",
  failed: "Fighting writer's block...",
};
