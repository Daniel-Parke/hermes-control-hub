# Story Weaver — Deep Dive & Improvement Plan

## Executive Summary

After a comprehensive review of the Story Weaver implementation, I've identified **5 bugs**, **3 architectural issues**, and designed a **new prompt pipeline** that resolves all reported problems while enabling the full feature set you described (series, rewrites, extensions).

The core architectural change: **separate planning from writing entirely.** Generate a detailed, immutable Story Bible upfront, then use it as a contract for every chapter.

---

## Part 1: Bug Analysis

### Bug 1 — Template Name Leaking Into Story Title
**Symptom:** Selecting "The Brave Little Robot" but changing all fields still produces robot-themed stories.

**Root Cause:** In `create/page.tsx` line 73:
```typescript
if (!title) setTitle(t.name);
```
When a template is applied, the title is set to the template name (e.g., "The Brave Little Robot"). The user changes premise/genre/characters but the title stays. The title is sent to the LLM as `Title: The Brave Little Robot` which biases the generation toward the template's theme even when the user changed everything else.

**Fix:** The title should only be auto-set if it was never manually edited. Track `titleManuallyEdited` state — if user has typed in the title field, never auto-set it from templates.

### Bug 2 — Formatting Review Returning as Chapter Content
**Symptom:** Later chapters return "formatting review" text instead of chapter prose.

**Root Cause:** In `api/stories/route.ts` lines 253-262:
```typescript
const needsFormatting = checkFormatting(content);
if (needsFormatting) {
  const formatPrompt = getStoryPrompt("format");
  content = await callLLM(formatPrompt, "Review and improve the formatting...\n\n" + content);
}
```
The formatting review LLM call receives the chapter text as `user` message and the formatting instructions as `system` message. If the LLM returns its review/assessment INSTEAD of the reformatted chapter, that review text gets stored as the chapter content. The `callLLM` function doesn't validate that the response is actual prose — it accepts any non-empty string.

**Fix:** Remove the formatting pass entirely. It adds latency and a failure mode. Improve the generation prompt instead.

### Bug 3 — Chapter 3 Finishing Before Chapter 2
**Symptom:** Chapter 3 completes while Chapter 2 is still pending/writing.

**Root Cause:** The reader page (`[id]/page.tsx` line 49-55) has an auto-generation effect:
```typescript
useEffect(() => {
  if (!story || generating) return;
  const pending = story.chapters?.find((c: Chapter) => c.status === "pending");
  if (pending) generateNext();
}, [story?.chapters]);
```

**The problem is the `generating` guard only exists in the CLIENT state.** The flow:
1. Story loaded → Chapter 2 is pending → `generateNext()` called → `setGenerating(true)`
2. Chapter 2 starts generating on server (status: "writing")
3. If ANYTHING triggers a story reload (navigation, focus, re-render), the effect re-fires
4. `story` object is fresh from server → Chapter 2 shows "writing", Chapter 3 shows "pending"
5. `find()` skips "writing" chapters → finds Chapter 3 pending → calls `generateNext()` AGAIN
6. Now TWO parallel LLM calls are running: Chapter 2 and Chapter 3
7. Whichever LLM call finishes first stores its content first
8. Chapter 3 might complete before Chapter 2

Additionally, there's NO server-side locking. The `handleGenerateChapter` function finds the first "pending" chapter and marks it "writing", but if two requests arrive simultaneously, both could read the same state before either writes.

**Fix:**
- **Server-side lock:** Before generating, atomically check+set status. If a chapter is already "writing", reject the request.
- **Client-side debounce:** Don't re-trigger generation on story reload if a generation is in flight.
- **Sequential enforcement:** Only generate chapter N+1 after chapter N is fully complete.

### Bug 4 — Full Chapter Text in Prompt Context (Token Bloat)
**Symptom:** Later chapters become lower quality, more repetitive, or truncated.

**Root Cause:** In `handleGenerateChapter` lines 236-239:
```typescript
const prevChapters = Object.entries(story.chapterContents)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([num, text]) => `Chapter ${num}:\n${text}`)
  .join("\n\n---\n\n");
```

This sends the COMPLETE TEXT of every previous chapter. For a 5-chapter story with 2000 words per chapter:
- Chapter 2 prompt: ~2000 words of context
- Chapter 3 prompt: ~4000 words of context
- Chapter 4 prompt: ~6000 words of context
- Chapter 5 prompt: ~8000 words of context

That's 8000+ words of raw chapter text PLUS the plan PLUS the system prompt. With the Nous model's context limit, this eats into the generation budget and reduces quality.

**Fix:** Use a rolling narrative summary. After each chapter is generated, update a summary that captures all key events, character development, and world state. Pass this summary + only the immediately previous chapter (for style continuity) as context.

### Bug 5 — No Response Validation on LLM Output
**Symptom:** Sometimes chapters contain meta-commentary ("Here's your chapter...", "I'll now write..."), system messages, or completely wrong content.

**Root Cause:** `callLLM` returns whatever the model outputs without validation:
```typescript
const content = data.choices?.[0]?.message?.content || "";
if (!content.trim()) { /* retry */ }
return content; // accepts ANY non-empty string
```

**Fix:** Add post-generation validation:
- Strip leading/trailing meta-commentary
- Verify minimum word count
- Verify it doesn't contain prompt artifacts like "===CHAPTER", "CONSISTENCY CHECKLIST", etc.

---

## Part 2: Architecture — The Story Bible Approach

### Core Concept

**Separate planning from writing entirely.** The current implementation generates a loose outline AND Chapter 1 in a single LLM call. The outline is vague ("key events: something mysterious happens") and doesn't constrain future chapters.

The new approach: **generate a detailed, immutable Story Bible upfront.** This is the contract the LLM must follow for every chapter. It defines:
- The overarching story arc with clear act structure
- **Fixed plot points** — specific events that MUST happen in specific chapters
- Character arcs — how each character evolves across the story
- World rules — immutable facts about the setting
- Thematic through-lines — what the story is about at its core

The Story Bible is generated in a dedicated first LLM call, then locked. Every chapter generation references it. The LLM doesn't invent plot — it writes prose toward known destinations.

### Why This Works

1. **Consistency** — The LLM can't wander off-script because the script is fixed
2. **Foreshadowing** — Early chapters can plant seeds for events defined in later chapters
3. **Natural evolution** — Character development is pre-planned, so it feels earned
4. **Rewrite safety** — Rewriting chapter 3 doesn't break chapters 4+ because the fixed plot points are still valid
5. **Series continuity** — The Story Bible concept extends naturally to series-level planning

### Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           USER CONFIGURATION             │
                    │  title, premise, genre, era, setting,    │
                    │  mood, pov, length, characters, wcRange  │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │         LLM CALL 1: STORY BIBLE          │
                    │  system: STORY_BIBLE_PROMPT              │
                    │  user:   all config above                │
                    │  output: structured story bible (JSON)   │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │         STORED: IMMUTABLE BIBLE          │
                    │  • storyArc: beginning → middle → end    │
                    │  • fixedPlotPoints: [                    │
                    │      { chapter: 3, event: "..." },       │
                    │      { chapter: 5, event: "..." },       │
                    │    ]                                      │
                    │  • characterArcs: [                      │
                    │      { name: "...", journey: "..." }     │
                    │    ]                                      │
                    │  • worldRules: [...]                     │
                    │  • themes: [...]                         │
                    │  • chapterOutlines: [                    │
                    │      { num: 1, title: "...", beats: [...]│
                    │    ]                                      │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │       LLM CALL 2: CHAPTER 1              │
                    │  system: CHAPTER_PROMPT                  │
                    │  user:   masterPrompt + storyBible +     │
                    │          "Write Chapter 1"               │
                    │  output: chapter 1 prose                 │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │       LLM CALL 3: SUMMARY UPDATE         │
                    │  system: SUMMARY_PROMPT                  │
                    │  user:   rollingSummary + chapter 1      │
                    │  output: updated rolling summary         │
                    └──────────────────┬──────────────────────┘
                                       │
                              (repeat for each chapter)
```

### Data Structure

```typescript
interface Story {
  id: string;
  title: string;
  seriesId?: string;           // For series support
  
  // Master prompt — built once from user config, never changes
  // Contains: style rules, formatting instructions, character profiles,
  // world description, POV requirements, tone guidelines
  masterPrompt: string;
  
  // Story Bible — generated by dedicated LLM call, immutable
  // This is the CONTRACT that governs all chapter generation
  storyBible: {
    storyArc: string;          // "Act 1: ... → Act 2: ... → Act 3: ..."
    fixedPlotPoints: Array<{
      chapter: number;         // Which chapter this MUST happen in
      event: string;           // Specific event description
      setup?: string;          // What must be planted in earlier chapters
    }>;
    characterArcs: Array<{
      name: string;
      startingState: string;   // Who they are at the start
      journey: string;         // How they change
      endingState: string;     // Who they become
    }>;
    worldRules: string[];      // Immutable facts about the world
    themes: string[];          // Thematic through-lines
    chapterOutlines: Array<{
      number: number;
      title: string;
      purpose: string;         // What this chapter accomplishes for the story
      keyBeats: string[];      // Specific events/scenes that must occur
      emotionalTone: string;   // Feel of this chapter
      setupForNext?: string;   // What to plant for the next chapter
    }>;
  };
  
  // Rolling narrative summary — updated after each chapter
  // Flexible length: 5 lines for simple stories, 20+ for complex ones
  // Captures: events that happened, character states, unresolved tensions,
  // world changes, relationships, foreshadowing planted
  rollingSummary: string;
  
  // Chapter data
  chapters: Array<{
    number: number;
    title: string;
    status: "pending" | "writing" | "complete" | "failed";
    wordCount: number;
    generatedAt: string | null;
  }>;
  chapterContents: Record<string, string>;  // "1": "full chapter text..."
  
  // User configuration (preserved for reference)
  config: StoryConfig;
  
  // Metadata
  status: "active" | "complete";
  createdAt: string;
  updatedAt: string;
}
```

### Generation Pipeline

**Step 1 — STORY BIBLE GENERATION:**
```
System: STORY_BIBLE_PROMPT
  "You are a master story planner. Create a detailed story bible..."
  + instructions for JSON structure
  + instructions for specificity (no vague events)
  + instructions for foreshadowing and setup
  
User: All story config
  Title, premise, genre, era, setting, mood, pov, characters, length

Output: Structured JSON story bible
  → Stored immutably in story.storyBible
  → NEVER modified after creation (except for rewrites, which regenerate)
```

**Step 2 — CHAPTER 1 GENERATION:**
```
System: CHAPTER_PROMPT
  Standard quality instructions
  + "You are writing toward fixed plot points defined in the story bible"
  + "Every scene must serve the story arc"

User: 
  [MASTER PROMPT — style, characters, world, formatting rules]
  
  [STORY BIBLE — full story arc, fixed plot points, chapter outlines]
  
  CHAPTER OUTLINE FOR CHAPTER 1:
  - Title: [from bible]
  - Purpose: [from bible]
  - Key beats: [from bible]
  - Emotional tone: [from bible]
  - Setup for next: [from bible]
  
  Write Chapter 1 now.

Output: Chapter 1 prose
  → Validated (strip meta, check word count)
  → Stored in chapterContents["1"]
```

**Step 3 — SUMMARY UPDATE (after each chapter):**
```
System: SUMMARY_PROMPT
  "Update the rolling narrative summary to include the new chapter..."
  + "Capture ALL events, character states, world changes, tensions"
  + "Length should be proportional to story complexity — 5 lines for simple stories, 20+ for complex ones"

User:
  PREVIOUS SUMMARY: [rollingSummary or "Story has not started yet"]
  
  NEW CHAPTER: [chapter N text]
  
  Update the summary to include this chapter's events.

Output: Updated rolling summary
  → Stored in story.rollingSummary
  → Flexible length based on complexity
```

**Step 4 — CHAPTER N GENERATION (for N > 1):**
```
System: CHAPTER_PROMPT

User:
  [MASTER PROMPT]
  
  [STORY BIBLE — full, unchanged]
  
  NARRATIVE SO FAR: [rollingSummary — full, no compression limit]
  
  PREVIOUS CHAPTER (Chapter N-1): [full text for style continuity]
  
  CHAPTER OUTLINE FOR CHAPTER N:
  - Title: [from bible]
  - Purpose: [from bible]
  - Key beats: [from bible]
  - Emotional tone: [from bible]
  
  Write Chapter N now. Reference the narrative summary for continuity.
  The previous chapter is provided for style matching only.

Output: Chapter N prose
  → Validated
  → Stored
  → Summary updated
```

### Key Design Decisions

1. **Story Bible is immutable.** Once generated, it never changes. This is the contract. Rewriting a chapter regenerates the chapter content but the bible stays the same — the plot points are still valid.

2. **Rolling summary has no length cap.** Simple 3-chapter stories might have 5-line summaries. Complex 10-chapter epics might have 30+ lines. The summary captures whatever is needed for continuity. This is more important than token savings — quality over efficiency.

3. **Previous chapter passed in full.** For style continuity, the immediately previous chapter is always passed in full. This is the ONE full chapter in context — all others are summarized.

4. **Master prompt is separate from Story Bible.** The master prompt = HOW to write (style, formatting, tone). The story bible = WHAT happens (plot, events, arcs). Clean separation of concerns.

5. **Fixed plot points are SPECIFIC.** Not "something mysterious happens" but "In Chapter 3, Captain Torres reveals he was the one who hired Vivian — the detective was set up from the start." Specificity forces quality.

---

## Part 3: Feature Additions

### Series Support
Add `seriesId` to story data. Stories in the same series share:
- A series-level master prompt (shared style, world rules, character profiles)
- A series-level rolling summary (what happened across all stories)
- Character arcs that span multiple stories

New story creation within a series pre-populates the masterPrompt with series context. The series-level summary is passed as additional context for every chapter.

### Chapter Rewrite
Add `rewrite-chapter` action:
1. User selects chapter N to rewrite
2. Set chapter N and ALL subsequent chapters to "pending" (invalidate forward)
3. Clear their contents
4. Rolling summary is truncated to events up to chapter N-1
5. Re-generate from chapter N forward using the same pipeline
6. Story Bible remains unchanged — plot points still apply

### Story Extension
Add `extend-story` action:
1. User specifies how many more chapters to add
2. Optionally generate additional chapter outlines (appended to bible)
3. New chapters appended with "pending" status
4. Generation continues from current last chapter

### Navigation Improvements
Current sidebar has one link: "Story Weaver" → `/recroom/story-weaver`

Proposed sidebar structure — expand Story Weaver to show sub-links when on a story-weaver page:
```
Rec Room
  └── Story Weaver → /recroom/story-weaver (dashboard)
      Shows sub-items when active:
        ├── Library → /recroom/story-weaver/library
        └── Create → /recroom/story-weaver/create
```

---

## Part 4: Implementation Plan

### Phase 1 — Critical Bug Fixes (1-2 hours)
1. **Remove formatting pass** from `api/stories/route.ts` — delete the checkFormatting + format LLM call
2. **Fix template title leak** in `create/page.tsx` — add `titleManuallyEdited` state
3. **Add server-side generation lock** in `handleGenerateChapter` — reject if any chapter is "writing"
4. **Add response validation** — strip meta-commentary, check word count, reject prompt artifacts

### Phase 2 — Story Bible Pipeline (3-4 hours)
1. **Write STORY_BIBLE_PROMPT** in `prompts.ts` — detailed planning prompt that outputs structured JSON
2. **Write updated CHAPTER_PROMPT** — references story bible, emphasizes writing toward fixed plot points
3. **Write SUMMARY_PROMPT** — flexible-length summary that captures all narrative state
4. **Refactor `handleCreate`** — split into:
   - Generate story bible (LLM call 1)
   - Generate chapter 1 (LLM call 2)
   - Generate initial summary (LLM call 3)
5. **Refactor `handleGenerateChapter`** — use new prompt structure:
   - Master prompt + story bible + rolling summary + previous chapter + chapter outline
6. **Update story data structure** — add `masterPrompt`, `storyBible`, `rollingSummary` fields
7. **Remove full chapter history** — replace with rolling summary + previous chapter only

### Phase 3 — Feature Additions (2-3 hours)
1. **Chapter rewrite** — new API action, forward-invalidation, summary truncation
2. **Story extension** — new API action, optional additional outlines
3. **Series support** — optional `seriesId`, series-level context
4. **Navigation** — add Library and Create as sidebar sub-links

### Phase 4 — Testing & Polish (1 hour)
1. Test 3-chapter novella generation — verify tight plotting, no wandering
2. Test 10-chapter book generation — verify summary keeps context bounded
3. Test chapter rewrite (rewrite chapter 3 of 5, verify 4-5 regenerate consistently)
4. Test template switching (change all fields, verify no theme leak)
5. Test parallel generation prevention (rapid clicks)
6. Update existing tests

---

## Part 5: Files to Modify

| File | Changes |
|------|---------|
| `src/lib/story-weaver/prompts.ts` | Add STORY_BIBLE_PROMPT, update CHAPTER_PROMPT, update SUMMARY_PROMPT for flexible length |
| `src/app/api/stories/route.ts` | Remove formatting pass, add generation lock, add story bible generation, add rolling summary, add response validation, add rewrite/extend actions |
| `src/app/recroom/story-weaver/create/page.tsx` | Fix title leak, show bible generation progress |
| `src/app/recroom/story-weaver/[id]/page.tsx` | Fix auto-generation race, add rewrite UI |
| `src/types/recroom.ts` | Add StoryBible interface, series types |
| `src/components/layout/Sidebar.tsx` | Add Story Weaver sub-navigation |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Story bible generation adds latency (~15-30s) | Acceptable — this is a one-time cost at creation. Quality improvement is worth it |
| Fixed plot points feel restrictive to the LLM | Key beats define WHAT must happen, not HOW. LLM has creative freedom in prose |
| Rolling summary grows very long for complex stories | This is acceptable by design — quality over token savings |
| Bible generation uses more tokens than current approach | Yes, but only at creation time. Chapter generation uses LESS (summary vs full chapters) |
| Rewrite invalidates too many chapters | Forward-invalidation is correct — rewriting chapter 3 MUST regenerate 4+ for consistency |

---

*Plan created 2026-04-11. Updated with Story Bible approach. Awaiting review before implementation.*
