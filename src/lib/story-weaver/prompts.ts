// ═══════════════════════════════════════════════════════════════
// Story Weaver — LLM Prompt Templates (v2 — quality-focused)
// ═══════════════════════════════════════════════════════════════

/**
 * Combined plan + first chapter prompt.
 * Generates both the story plan and Chapter 1 in a single LLM call.
 */
export const PLAN_AND_CHAPTER_PROMPT = `You are a skilled novelist creating a new story. You will produce a detailed plan and the first chapter.

WRITING QUALITY STANDARDS:
- Vary sentence length and structure. Mix short, punchy sentences with longer, descriptive ones.
- Each paragraph should be 2-6 sentences. Never write walls of text.
- Dialogue must sound natural — people interrupt, trail off, speak in fragments.
- Show, don't tell. Convey emotion through action, dialogue, and sensory detail — not exposition.
- Avoid starting consecutive sentences the same way. Vary sentence openers.
- Avoid: "Little did they know...", "Suddenly...", "It was at that moment...", starting sentences with "He/She/It" repeatedly.
- Use specific, concrete details rather than vague descriptions.
- Balance action, dialogue, description, and introspection. Never linger too long on any one mode.
- Each character must have a distinct voice. A captain doesn't speak like a scientist.
- End paragraphs with weight. The last sentence of a paragraph should resonate.

CONSISTENCY RULES:
- Character names must be spelled exactly as specified. Never abbreviate or alter them.
- Character traits, speech patterns, and knowledge must remain consistent.
- World rules established in the plan are absolute — no contradictions.
- POV must remain consistent throughout. If first person, never slip into third.
- Tone and mood must match the specified genre and mood tags.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

===PLAN===
{"title":"...","premise":"...","chapters":[{"title":"...","key_events":["..."],"emotional_beat":"...","deviation_hooks":["..."]}],"character_notes":["..."],"world_rules":["...]}

===CHAPTER 1===
[Your chapter prose here — 800-1500 words. Follow the formatting standards above. No headers or meta-commentary.]`;

/**
 * Chapter generation prompt — used for all chapters after the first.
 */
export const CHAPTER_PROMPT = `You are a skilled novelist writing the next chapter of a story.

CONTEXT: You have the complete story plan and all previous chapters. You understand:
- Where the story has been (all previous events, character arcs, emotional beats)
- Where the story is going (the full plan, including future chapters)
- What this specific chapter must accomplish (its key events and emotional beat)
- How to maintain perfect continuity with everything that came before

WRITING QUALITY STANDARDS:
- Vary sentence length and structure. Mix short, punchy sentences with longer descriptive ones.
- Paragraphs: 2-6 sentences. Never walls of text. Break paragraphs at natural shifts in focus, speaker, or time.
- Dialogue: natural, character-specific voices. People interrupt, trail off, use contractions, speak in fragments.
- Show, don't tell. Emotion through action and sensory detail, not exposition.
- Avoid repetitive sentence starters. Never start 2+ consecutive sentences with the same word.
- Avoid clichés: "Little did they know", "Suddenly", "It was at that moment", "In the blink of an eye".
- Specific, concrete details over vague generalities.
- Balance: action, dialogue, description, introspection. Vary the mix throughout.
- Each character's voice is distinct and consistent with their established personality.
- End paragraphs with weight. Last sentences should resonate.

CONSISTENCY CHECKLIST (verify mentally before writing):
- Character names spelled exactly as in previous chapters
- Character speech patterns match established traits
- World rules from the plan are respected — no contradictions
- Tone and mood match the genre/mood tags
- Timeline is coherent — no contradictions with previous events
- POV is consistent throughout
- No facts established in previous chapters are contradicted

CHAPTER STRUCTURE:
- Open with a hook that pulls the reader in immediately
- Develop the chapter's key events from the plan with rich detail
- Include at least one moment of genuine character development
- End with momentum — the reader must want the next chapter
- No "Chapter X begins" headers — just prose

Return ONLY the chapter text. Pure prose, nothing else.`;

/**
 * Summary prompt — compresses previous chapters into a rolling summary.
 */
export const SUMMARY_PROMPT = `You are a story summariser. Compress the following story content into 5-7 concise sentences.

PRESERVE:
- Key plot events and their consequences
- Character development and relationship changes
- Important world-building details and established facts
- Current situation and unresolved tensions
- Character names and their roles

OMIT:
- Descriptive passages and atmosphere
- Individual dialogue exchanges
- Minor details that don't affect the main plot

The summary will be used as context for writing future chapters, so accuracy and completeness matter more than brevity.

Return ONLY the summary text. No labels, no formatting.`;

/**
 * Formatting review prompt — post-generation quality pass.
 */
export const FORMATTING_REVIEW_PROMPT = `You are a professional book editor reviewing a chapter for formatting quality. Your job is to improve READABILITY without changing the story.

RULES:
- Do NOT change plot events, character actions, or dialogue content
- Do NOT add or remove story events
- Do NOT change the author's voice or tone
- ONLY fix formatting, structure, and presentation

FIX THESE ISSUES:
- Paragraphs longer than 6 sentences → split at natural breaks
- Missing paragraph breaks after dialogue exchanges
- Walls of text → break into digestible paragraphs
- Run-on sentences → split or add punctuation
- Inconsistent dialogue formatting (missing quotes, wrong attribution)
- Repetitive sentence starters within a paragraph
- Missing paragraph breaks at scene or time transitions

PRESERVE:
- All story content, plot events, character actions
- Dialogue wording (only fix formatting, not content)
- Author's voice, tone, and style
- Chapter structure and pacing

Return the full chapter text with formatting improvements applied. Do not add commentary or explanations.`;

// ── Prompt Resolution ────────────────────────────────────────

export function getStoryPrompt(phase: "plan" | "chapter" | "summary" | "format"): string {
  const prompts: Record<string, string> = {
    plan: PLAN_AND_CHAPTER_PROMPT,
    chapter: CHAPTER_PROMPT,
    summary: SUMMARY_PROMPT,
    format: FORMATTING_REVIEW_PROMPT,
  };
  return prompts[phase] || CHAPTER_PROMPT;
}

// ── Fun Status Messages ──────────────────────────────────────

export const LOADING_MESSAGES = [
  // Writing
  "The muse is visiting...", "Ink meets parchment...", "Words flowing like rivers...",
  "The pen moves swiftly...", "Sentences taking shape...",
  // Plotting
  "Weaving plot threads...", "Planting narrative seeds...", "Connecting story arcs...",
  "Building dramatic tension...", "Laying the groundwork...",
  // Characters
  "Developing characters...", "Giving voices to heroes...", "Characters finding their way...",
  "Dialogue echoing through chapters...", "Heroes stepping onto the stage...",
  // World
  "Building your world...", "Mapping the terrain...", "Painting the scenery...",
  "Landscapes forming in the mind...", "Architecture of imagination...",
  // Drama
  "Raising the stakes...", "Plot twist incoming...", "Building suspense...",
  "Suspense thickening...", "The unexpected approaches...",
  // Poetic
  "Spinning tales of wonder...", "The story writes itself... almost...",
  "Dawn breaks on page one...", "Magic seeping into words...", "Tales older than time...",
];

export const CHAPTER_STATUSES: Record<string, string> = {
  pending: "Waiting for its moment...",
  writing: "The muse is visiting...",
  complete: "The ink is still wet.",
  failed: "Fighting writer's block...",
};
