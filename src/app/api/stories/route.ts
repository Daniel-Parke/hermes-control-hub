import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { getStoryPrompt } from "@/lib/story-weaver/prompts";
import type { StoryArc as StoryArcType, ChapterOutline } from "@/types/recroom";

// ═══════════════════════════════════════════════════════════════
// Stories API — V2 (reliability, edit, continue, characters, prompts)
// ═══════════════════════════════════════════════════════════════

const SAVE_DIR = PATHS.stories;
const GATEWAY_API = "http://127.0.0.1:8642/v1/chat/completions";
const CHARACTERS_FILE = SAVE_DIR + "/characters.json";
const PROMPTS_FILE = SAVE_DIR + "/prompts.json";

function ensureDir() {
  if (!existsSync(SAVE_DIR)) mkdirSync(SAVE_DIR, { recursive: true });
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function getPath(id: string): string {
  return SAVE_DIR + "/" + sanitizeId(id) + ".json";
}

// ── LLM Call (increased timeout for long stories) ────────────

async function callLLM(system: string, user: string, timeoutMs = 300_000): Promise<string> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(GATEWAY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "hermes",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.85,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      if (resp.status === 429) {
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 30_000 * attempt)); continue; }
        throw new Error("Rate limit reached. Please wait a minute and try again.");
      }
      if (!resp.ok) throw new Error("Gateway API error: " + resp.status);
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (!content.trim()) {
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 5_000 * attempt)); continue; }
        throw new Error("Empty response from model. Please try again.");
      }
      return content;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s). Please try again.`);
      }
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 3_000 * attempt));
    } finally { clearTimeout(timeout); }
  }
  throw new Error("LLM call failed after retries");
}

// ── Response Validation ──────────────────────────────────────

function validateChapterOutput(raw: string): string {
  let content = raw.trim();

  const metaPrefixes = [
    /^here(?:'s| is) (?:your |the )?(?:chapter|prose|story)/i,
    /^(?:sure|certainly|of course|okay|alright)[.!]?\s*/i,
    /^i'll (?:now |go ahead and )?write/i,
    /^let me (?:write|craft|create)/i,
    /^chapter \d+[.:]\s*/i,
  ];
  for (const prefix of metaPrefixes) {
    content = content.replace(prefix, "");
  }

  const metaSuffixes = [
    /\s*(?:i hope|let me know|i trust|this should|feel free)[^.!?]*[.!?\s]*$/i,
    /\s*---+\s*(?:end of chapter|chapter \d+ ends?)[^.]*$/i,
  ];
  for (const suffix of metaSuffixes) {
    content = content.replace(suffix, "");
  }

  content = content.replace(/===CHAPTER \d+===/gi, "");
  content = content.replace(/===ARC===/gi, "");
  content = content.replace(/===PLAN===/gi, "");

  return content.trim();
}

// ── Build Master Prompt ──────────────────────────────────────

function buildMasterPrompt(config: Record<string, unknown>): string {
  const wordRanges: Record<string, string> = {
    short: "800-1200", medium: "1200-1800", standard: "1800-2500",
    long: "2500-3500", epic: "3500-5000", marathon: "5000+",
  };
  const wcRange = wordRanges[(config.wordCountRange as string) || "standard"] || "1800-2500";

  const characters = (config.characters as Array<Record<string, string>>) || [];
  const charProfiles = characters.map(c =>
    `- ${c.name} (${c.role}): ${c.description}`
  ).join("\n");

  return [
    `STORY CONFIGURATION:`,
    `Title: ${(config.title as string) || "Untitled"}`,
    `Premise: ${config.premise as string}`,
    `Genre: ${(config.genre as string) || "General"}`,
    `Era: ${(config.era as string) || "Modern"}`,
    `Setting: ${(config.setting as string) || ""}`,
    `Mood: ${((config.mood as string[]) || []).join(", ")}`,
    `POV: ${(config.pov as string) || "first"}`,
    `Length: ${(config.length as string) || "medium"}`,
    `Chapter Length: ${wcRange} words per chapter`,
    ``,
    `CHARACTERS:`,
    charProfiles || "(none specified)",
  ].join("\n");
}

// ── POST Handler ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    switch (action) {
      case "create": return handleCreate(body);
      case "list": return handleList();
      case "load": return handleLoad(body);
      case "generate-chapter": return handleGenerateChapter(body);
      case "retry-chapter": return handleRetryChapter(body);
      case "rewrite-chapter": return handleRewriteChapter(body);
      case "edit-chapter": return handleEditChapter(body);
      case "extend": return handleExtend(body);
      case "continue": return handleContinue(body);
      case "update": return handleUpdate(body);
      case "delete": return handleDelete(body);
      case "characters": return handleCharacters(body);
      case "prompts": return handlePrompts(body);
      default: return NextResponse.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (err) {
    logApiError("POST /api/stories", "request", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// Story Creation — saves draft first for recovery
// ═══════════════════════════════════════════════════════════════

async function handleCreate(body: Record<string, unknown>): Promise<NextResponse> {
  ensureDir();
  const { title, config } = body;
  if (!config || !(config as Record<string, unknown>)?.premise) {
    return NextResponse.json({ error: "Missing premise" }, { status: 400 });
  }

  const cfg = config as Record<string, unknown>;
  const masterPrompt = buildMasterPrompt({ ...cfg, title });
  const storyId = "story_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  const storyTitle = (title as string) || "Untitled Story";

  // Save draft BEFORE LLM calls — allows recovery on failure
  const draftStory = {
    id: storyId,
    title: storyTitle,
    masterPrompt,
    storyArc: null,
    rollingSummary: "",
    chapters: [],
    chapterContents: {},
    config: cfg,
    status: "generating",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(getPath(storyId), JSON.stringify(draftStory, null, 2));

  try {
    // ── Step 1: Generate Story Arc + Chapter 1 (single LLM call) ──
    const system = getStoryPrompt("arc");
    const userMessage = masterPrompt +
      `\n\nNumber of chapters: ${getChapterCount(cfg.length as string)}` +
      `\n\nGenerate the story arc and write Chapter 1 now.`;

    const raw = await callLLM(system, userMessage);

    // Parse ===ARC=== and ===CHAPTER 1=== sections
    let storyArc: StoryArcType | null = null;
    let chapter1 = "";

    const arcMatch = raw.match(/===ARC===\s*([\s\S]*?)(?===CHAPTER 1===|$)/);
    const chapterMatch = raw.match(/===CHAPTER 1===\s*([\s\S]*?)$/);

    if (arcMatch) {
      try {
        const jsonStr = arcMatch[1].trim();
        storyArc = JSON.parse(jsonStr);
      } catch {
        const jsonExtract = arcMatch[1].match(/\{[\s\S]*\}/);
        if (jsonExtract) {
          try { storyArc = JSON.parse(jsonExtract[0]); } catch {}
        }
      }
    }

    if (chapterMatch) {
      chapter1 = validateChapterOutput(chapterMatch[1]);
    }

    // Fallback: try to parse entire response
    if (!storyArc) {
      const jsonMatch = raw.match(/\{[\s\S]*"storyArc"[\s\S]*"chapterOutlines"[\s\S]*\}/);
      if (jsonMatch) {
        try { storyArc = JSON.parse(jsonMatch[0]); } catch {}
      }
    }
    if (!chapter1 && !storyArc) {
      chapter1 = validateChapterOutput(raw);
    }

    // Build fallback arc if parsing failed
    if (!storyArc) {
      const chapterCount = getChapterCount(cfg.length as string);
      storyArc = {
        storyArc: `A ${cfg.genre || "general"} story with beginning, middle, and end.`,
        fixedPlotPoints: Array.from({ length: chapterCount }, (_, i) => ({
          chapter: i + 1, event: `Chapter ${i + 1} advances the plot`,
        })),
        characterArcs: ((cfg.characters as Array<Record<string, string>>) || []).map(c => ({
          name: c.name, startingState: c.description || "Unknown",
          journey: "Grows through challenges", endingState: "Transformed",
        })),
        worldRules: [cfg.setting ? `Setting: ${cfg.setting}` : "As described in the premise"],
        themes: [cfg.genre ? `Themes of ${cfg.genre}` : "Human nature"],
        chapterOutlines: Array.from({ length: chapterCount }, (_, i) => ({
          number: i + 1, title: `Chapter ${i + 1}`,
          purpose: i === 0 ? "Introduction" : i === chapterCount - 1 ? "Resolution" : "Development",
          keyBeats: [`Key event for chapter ${i + 1}`],
          emotionalTone: "Engaging",
        })),
      };
    }

    // ── Step 2: Generate Rolling Summary (single LLM call) ──
    let rollingSummary = "";
    try {
      const summarySystem = getStoryPrompt("summary");
      const summaryUser = `NEW CHAPTER (Chapter 1):\n${chapter1}\n\nCreate the initial rolling summary.`;
      rollingSummary = await callLLM(summarySystem, summaryUser);
    } catch {
      rollingSummary = `Chapter 1 introduces the story. ${chapter1.slice(0, 200)}...`;
    }

    // ── Build Final Story Object ──
    const chapters = storyArc.chapterOutlines.map((ch: ChapterOutline, i: number) => ({
      number: i + 1,
      title: ch.title,
      status: i === 0 ? "complete" : "pending",
      wordCount: i === 0 ? chapter1.split(/\s+/).length : 0,
      generatedAt: i === 0 ? new Date().toISOString() : null,
    }));

    const allComplete = chapters.every((c: { status: string }) => c.status === "complete");

    const story = {
      id: storyId,
      title: storyTitle,
      masterPrompt,
      storyArc,
      rollingSummary,
      chapters,
      chapterContents: chapter1 ? { "1": chapter1 } : {},
      config: cfg,
      status: allComplete ? "complete" : "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    writeFileSync(getPath(storyId), JSON.stringify(story, null, 2));
    return NextResponse.json({ data: story });
  } catch (err) {
    // Save error state — story persists for recovery
    const errorStory = {
      ...draftStory,
      status: "failed",
      generationError: err instanceof Error ? err.message : "Creation failed",
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(getPath(storyId), JSON.stringify(errorStory, null, 2));
    logApiError("POST /api/stories", "create", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Creation failed",
      data: errorStory,
    }, { status: 500 });
  }
}

// ── Build Chapter Prompt ─────────────────────────────────────

function buildChapterPrompt(
  masterPrompt: string,
  storyArc: StoryArcType,
  rollingSummary: string | null,
  previousChapter: string | null,
  outline: ChapterOutline
): string {
  const parts: string[] = [];

  parts.push("===MASTER PROMPT===\n" + masterPrompt);
  parts.push("\n===STORY ARC===\n" + JSON.stringify(storyArc, null, 2));

  if (rollingSummary) {
    parts.push("\n===NARRATIVE SO FAR===\n" + rollingSummary);
  }

  if (previousChapter) {
    parts.push("\n===PREVIOUS CHAPTER===\n" + previousChapter);
  }

  parts.push("\n===CHAPTER OUTLINE===" +
    `\nTitle: ${outline.title}` +
    `\nPurpose: ${outline.purpose}` +
    `\nKey Beats: ${outline.keyBeats.join("; ")}` +
    `\nEmotional Tone: ${outline.emotionalTone}` +
    (outline.setupForNext ? `\nSetup for Next: ${outline.setupForNext}` : "")
  );

  parts.push(`\nWrite Chapter ${outline.number} now. Return ONLY prose.`);

  return parts.join("\n");
}

// ── Generate Next Chapter ────────────────────────────────────

async function handleGenerateChapter(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));

  const nextIdx = story.chapters.findIndex((c: Record<string, unknown>) => c.status === "pending");
  if (nextIdx === -1) {
    // All chapters complete — return success, not error
    story.status = "complete";
    story.updatedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(story, null, 2));
    return NextResponse.json({ data: { message: "All chapters complete", story } });
  }

  const nextNum = nextIdx + 1;

  // Server-side lock
  const anyWriting = story.chapters.some((c: Record<string, unknown>) => c.status === "writing");
  if (anyWriting) {
    return NextResponse.json({ error: "A chapter is already being generated. Please wait." }, { status: 409 });
  }

  story.chapters[nextIdx].status = "writing";
  writeFileSync(path, JSON.stringify(story, null, 2));

  try {
    const arc: StoryArcType = story.storyArc;
    const chapterOutline = arc.chapterOutlines?.[nextIdx] || {
      number: nextNum, title: `Chapter ${nextNum}`, purpose: "Continue the story",
      keyBeats: [`Key event for chapter ${nextNum}`], emotionalTone: "Engaging",
    };

    const prevChapter = nextNum > 1 ? story.chapterContents[String(nextNum - 1)] || null : null;

    const system = getStoryPrompt("chapter");
    const userMessage = buildChapterPrompt(
      story.masterPrompt, arc, story.rollingSummary || null, prevChapter, chapterOutline
    );

    const raw = await callLLM(system, userMessage);
    const content = validateChapterOutput(raw);

    story.chapterContents[nextNum] = content;
    story.chapters[nextIdx].status = "complete";
    story.chapters[nextIdx].wordCount = content.split(/\s+/).length;
    story.chapters[nextIdx].generatedAt = new Date().toISOString();
    story.updatedAt = new Date().toISOString();

    // Update rolling summary
    try {
      const summarySystem = getStoryPrompt("summary");
      const summaryUser = `PREVIOUS SUMMARY:\n${story.rollingSummary || "Story has not started yet."}\n\nNEW CHAPTER (Chapter ${nextNum}):\n${content}\n\nUpdate the rolling summary.`;
      story.rollingSummary = await callLLM(summarySystem, summaryUser);
    } catch {}

    if (story.chapters.every((c: Record<string, unknown>) => c.status === "complete")) {
      story.status = "complete";
    }

    writeFileSync(path, JSON.stringify(story, null, 2));
    return NextResponse.json({ data: { chapter: nextNum, content, story } });
  } catch (err) {
    story.chapters[nextIdx].status = "failed";
    story.chapters[nextIdx].error = err instanceof Error ? err.message : "Generation failed";
    writeFileSync(path, JSON.stringify(story, null, 2));
    logApiError("POST /api/stories", "generate-chapter", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Generation failed",
      data: { chapter: nextNum, story },
    }, { status: 500 });
  }
}

// ── Retry Failed Chapter ─────────────────────────────────────

async function handleRetryChapter(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId, chapterNumber } = body;
  if (!storyId || !chapterNumber) {
    return NextResponse.json({ error: "Missing storyId or chapterNumber" }, { status: 400 });
  }

  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));
  const chNum = chapterNumber as number;
  const chIdx = chNum - 1;

  if (chIdx < 0 || chIdx >= story.chapters.length) {
    return NextResponse.json({ error: "Invalid chapter number" }, { status: 400 });
  }

  const chapter = story.chapters[chIdx];
  if (chapter.status !== "failed") {
    return NextResponse.json({ error: "Chapter is not in failed state" }, { status: 400 });
  }

  // Reset to pending so generate-chapter picks it up
  story.chapters[chIdx].status = "pending";
  story.chapters[chIdx].error = null;
  writeFileSync(path, JSON.stringify(story, null, 2));

  // Immediately trigger generation
  return handleGenerateChapter({ storyId });
}

// ── Edit Chapter (prompt-based rewrite with cascade) ─────────

async function handleEditChapter(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId, chapterNumber, editPrompt } = body;
  if (!storyId || !chapterNumber || !editPrompt) {
    return NextResponse.json({ error: "Missing storyId, chapterNumber, or editPrompt" }, { status: 400 });
  }

  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));
  const chNum = chapterNumber as number;
  const chIdx = chNum - 1;

  if (chIdx < 0 || chIdx >= story.chapters.length) {
    return NextResponse.json({ error: "Invalid chapter number" }, { status: 400 });
  }

  // Build edit prompt with existing chapter context
  const existingChapter = story.chapterContents[String(chNum)] || "";
  const arc: StoryArcType = story.storyArc;
  const chapterOutline = arc.chapterOutlines?.[chIdx] || {
    number: chNum, title: story.chapters[chIdx].title, purpose: "Continue the story",
    keyBeats: [], emotionalTone: "Engaging",
  };

  const editSystem = getStoryPrompt("chapter");
  const editUser = [
    "===EDIT INSTRUCTIONS===",
    editPrompt,
    "",
    "===EXISTING CHAPTER===",
    existingChapter,
    "",
    "===MASTER PROMPT===",
    story.masterPrompt,
    "",
    "===STORY ARC===",
    JSON.stringify(arc, null, 2),
    "",
    "===CHAPTER OUTLINE===",
    `Title: ${chapterOutline.title}`,
    `Purpose: ${chapterOutline.purpose}`,
    `Key Beats: ${chapterOutline.keyBeats.join("; ")}`,
    `Emotional Tone: ${chapterOutline.emotionalTone}`,
    "",
    "Rewrite this chapter incorporating the edit instructions. Return ONLY prose.",
  ].join("\n");

  // Mark chapter as writing
  story.chapters[chIdx].status = "writing";
  writeFileSync(path, JSON.stringify(story, null, 2));

  try {
    const raw = await callLLM(editSystem, editUser);
    const content = validateChapterOutput(raw);

    // Update the edited chapter
    story.chapterContents[String(chNum)] = content;
    story.chapters[chIdx].status = "complete";
    story.chapters[chIdx].wordCount = content.split(/\s+/).length;
    story.chapters[chIdx].generatedAt = new Date().toISOString();

    // Invalidate downstream chapters (N+1 through end)
    for (let i = chIdx + 1; i < story.chapters.length; i++) {
      story.chapters[i].status = "pending";
      story.chapters[i].wordCount = 0;
      story.chapters[i].generatedAt = null;
      delete story.chapterContents[String(i + 1)];
    }

    // Recompute rolling summary from chapters up to and including the edited one
    try {
      const summarySystem = getStoryPrompt("summary");
      const chaptersUpToN = Object.entries(story.chapterContents as Record<string, string>)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([num, text]) => `Chapter ${num}:\n${text}`)
        .join("\n\n");
      story.rollingSummary = await callLLM(summarySystem,
        `Create a rolling summary of these chapters:\n\n${chaptersUpToN}`);
    } catch {
      story.rollingSummary = `Chapter ${chNum} was edited. ${content.slice(0, 200)}...`;
    }

    story.status = "active";
    story.updatedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(story, null, 2));
    return NextResponse.json({ data: { chapter: chNum, content, story } });
  } catch (err) {
    story.chapters[chIdx].status = "failed";
    story.chapters[chIdx].error = err instanceof Error ? err.message : "Edit failed";
    writeFileSync(path, JSON.stringify(story, null, 2));
    logApiError("POST /api/stories", "edit-chapter", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Edit failed",
      data: { chapter: chNum, story },
    }, { status: 500 });
  }
}

// ── Rewrite Chapter (existing forward-invalidation) ──────────

async function handleRewriteChapter(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId, chapterNumber } = body;
  if (!storyId || !chapterNumber) {
    return NextResponse.json({ error: "Missing storyId or chapterNumber" }, { status: 400 });
  }

  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));
  const chNum = chapterNumber as number;

  if (chNum < 1 || chNum > story.chapters.length) {
    return NextResponse.json({ error: "Invalid chapter number" }, { status: 400 });
  }

  // Invalidate from chapter N forward
  for (let i = chNum - 1; i < story.chapters.length; i++) {
    story.chapters[i].status = i === chNum - 1 ? "writing" : "pending";
    story.chapters[i].wordCount = 0;
    story.chapters[i].generatedAt = null;
    delete story.chapterContents[String(i + 1)];
  }

  // Truncate rolling summary
  if (chNum > 1) {
    try {
      const summarySystem = getStoryPrompt("summary");
      const chaptersBeforeN = Object.entries(story.chapterContents as Record<string, string>)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([num, text]) => `Chapter ${num}:\n${text}`)
        .join("\n\n");
      story.rollingSummary = await callLLM(summarySystem,
        `Create a rolling summary of these unchanged chapters:\n\n${chaptersBeforeN}`);
    } catch { story.rollingSummary = ""; }
  } else {
    story.rollingSummary = "";
  }

  writeFileSync(path, JSON.stringify(story, null, 2));
  return handleGenerateChapter({ storyId });
}

// ── Extend Story ─────────────────────────────────────────────

async function handleExtend(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId, additionalChapters } = body;
  if (!storyId || !additionalChapters) {
    return NextResponse.json({ error: "Missing storyId or additionalChapters" }, { status: 400 });
  }

  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));
  const addCount = additionalChapters as number;
  const startNum = story.chapters.length + 1;

  for (let i = 0; i < addCount; i++) {
    const num = startNum + i;
    const outline = {
      number: num, title: `Chapter ${num}`, purpose: "Continue the story",
      keyBeats: [`New event for chapter ${num}`], emotionalTone: "Engaging",
    };
    story.storyArc.chapterOutlines.push(outline);
    story.chapters.push({ number: num, title: outline.title, status: "pending", wordCount: 0, generatedAt: null });
  }

  story.status = "active";
  story.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(story, null, 2));
  return NextResponse.json({ data: story });
}

// ── Continue Story (V2 — LLM-generated continuation) ────────

async function handleContinue(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId, direction, count } = body;
  if (!storyId || !direction) {
    return NextResponse.json({ error: "Missing storyId or direction" }, { status: 400 });
  }

  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));
  if (story.status !== "complete") {
    return NextResponse.json({ error: "Can only continue completed stories" }, { status: 400 });
  }

  const addCount = (count as number) || 3;
  const startNum = story.chapters.length + 1;

  // Use LLM to generate new chapter outlines that fit the existing story
  const continueSystem = `You are a story architect. Given the existing story arc, rolling summary, and a new direction, generate chapter outlines for a continuation.

Return ONLY a JSON array of chapter outlines. Each outline must have: number, title, purpose, keyBeats (array of strings), emotionalTone.

The outlines must:
- Continue naturally from where the story left off
- Respect all established characters, world rules, and themes
- Incorporate the new direction provided by the user
- Include specific, detailed key beats (not vague descriptions)
- Build toward a satisfying conclusion`;

  const continueUser = [
    "===EXISTING STORY ARC===",
    JSON.stringify(story.storyArc, null, 2),
    "",
    "===ROLLING SUMMARY===",
    story.rollingSummary,
    "",
    "===CONTINUATION DIRECTION===",
    direction,
    "",
    `Generate ${addCount} new chapter outlines starting from chapter ${startNum}.`,
  ].join("\n");

  try {
    const raw = await callLLM(continueSystem, continueUser);

    // Parse outlines from response
    let outlines: ChapterOutline[] = [];
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        outlines = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    // Fallback if parsing fails
    if (!outlines.length) {
      outlines = Array.from({ length: addCount }, (_, i) => ({
        number: startNum + i,
        title: `Chapter ${startNum + i}`,
        purpose: "Continue the story",
        keyBeats: [`Continuation event for chapter ${startNum + i}`],
        emotionalTone: "Engaging",
      }));
    }

    // Append to story arc and chapters
    for (const outline of outlines) {
      story.storyArc.chapterOutlines.push(outline);
      story.chapters.push({
        number: outline.number,
        title: outline.title,
        status: "pending",
        wordCount: 0,
        generatedAt: null,
      });
    }

    story.status = "active";
    story.updatedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(story, null, 2));
    return NextResponse.json({ data: story });
  } catch (err) {
    logApiError("POST /api/stories", "continue", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Continuation failed",
    }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getChapterCount(length: string): number {
  switch (length) {
    case "short": return 3;
    case "medium": return 6;
    case "long": return 10;
    default: return 6;
  }
}

// ── List ─────────────────────────────────────────────────────

async function handleList(): Promise<NextResponse> {
  ensureDir();
  try {
    const files = readdirSync(SAVE_DIR).filter(f => f.endsWith(".json") && f !== "characters.json" && f !== "prompts.json");
    const stories = files.map(f => {
      try {
        const s = JSON.parse(readFileSync(SAVE_DIR + "/" + f, "utf-8"));
        return {
          id: s.id, title: s.title, status: s.status,
          generationError: s.generationError || null,
          chapters: s.chapters?.map((c: Record<string, unknown>) => ({
            number: c.number, title: c.title, status: c.status, wordCount: c.wordCount, error: c.error
          })),
          config: s.config, createdAt: s.createdAt, updatedAt: s.updatedAt,
        };
      } catch { return null; }
    }).filter(Boolean) as Array<Record<string, unknown>>;
    stories.sort((a, b) =>
      new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime()
    );
    return NextResponse.json({ data: { stories } });
  } catch { return NextResponse.json({ data: { stories: [] } }); }
}

// ── Load ─────────────────────────────────────────────────────

async function handleLoad(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(readFileSync(path, "utf-8")) });
}

// ── Update ───────────────────────────────────────────────────

async function handleUpdate(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId, ...fields } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  const story = JSON.parse(readFileSync(path, "utf-8"));
  const f = fields as Record<string, unknown>;
  if (f.title) story.title = f.title;
  if (f.chapters) story.chapters = f.chapters;
  if (f.rollingSummary) story.rollingSummary = f.rollingSummary;
  if (f.status) story.status = f.status;
  story.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(story, null, 2));
  return NextResponse.json({ data: story });
}

// ── Delete ───────────────────────────────────────────────────

async function handleDelete(body: Record<string, unknown>): Promise<NextResponse> {
  const { storyId } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
  const path = getPath(storyId as string);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  unlinkSync(path);
  return NextResponse.json({ data: { deleted: true } });
}

// ═══════════════════════════════════════════════════════════════
// Character Sheets CRUD
// ═══════════════════════════════════════════════════════════════

interface CharacterSheet {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string[];
  backstory: string;
  appearance: string;
  speechPatterns: string;
  relationships: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function loadCharacters(): CharacterSheet[] {
  ensureDir();
  if (!existsSync(CHARACTERS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(CHARACTERS_FILE, "utf-8"));
  } catch { return []; }
}

function saveCharacters(chars: CharacterSheet[]): void {
  ensureDir();
  writeFileSync(CHARACTERS_FILE, JSON.stringify(chars, null, 2));
}

async function handleCharacters(body: Record<string, unknown>): Promise<NextResponse> {
  const subAction = body.subAction as string;

  switch (subAction) {
    case "list": {
      return NextResponse.json({ data: { characters: loadCharacters() } });
    }
    case "create": {
      const chars = loadCharacters();
      const now = new Date().toISOString();
      const newChar: CharacterSheet = {
        id: "char_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
        name: (body.name as string) || "Unnamed",
        role: (body.role as string) || "supporting",
        description: (body.description as string) || "",
        personality: (body.personality as string[]) || [],
        backstory: (body.backstory as string) || "",
        appearance: (body.appearance as string) || "",
        speechPatterns: (body.speechPatterns as string) || "",
        relationships: (body.relationships as string) || "",
        tags: (body.tags as string[]) || [],
        createdAt: now,
        updatedAt: now,
      };
      chars.push(newChar);
      saveCharacters(chars);
      return NextResponse.json({ data: newChar });
    }
    case "update": {
      const charId = body.charId as string;
      if (!charId) return NextResponse.json({ error: "Missing charId" }, { status: 400 });
      const chars = loadCharacters();
      const idx = chars.findIndex(c => c.id === charId);
      if (idx === -1) return NextResponse.json({ error: "Character not found" }, { status: 404 });
      const fields = ["name", "role", "description", "personality", "backstory", "appearance", "speechPatterns", "relationships", "tags"] as const;
      for (const f of fields) {
        if (body[f] !== undefined) (chars[idx] as unknown as Record<string, unknown>)[f] = body[f];
      }
      chars[idx].updatedAt = new Date().toISOString();
      saveCharacters(chars);
      return NextResponse.json({ data: chars[idx] });
    }
    case "delete": {
      const charId = body.charId as string;
      if (!charId) return NextResponse.json({ error: "Missing charId" }, { status: 400 });
      const chars = loadCharacters();
      const filtered = chars.filter(c => c.id !== charId);
      if (filtered.length === chars.length) return NextResponse.json({ error: "Character not found" }, { status: 404 });
      saveCharacters(filtered);
      return NextResponse.json({ data: { deleted: true } });
    }
    default:
      return NextResponse.json({ error: "Unknown subAction: " + subAction }, { status: 400 });
  }
}

// ═══════════════════════════════════════════════════════════════
// Story Prompts CRUD
// ═══════════════════════════════════════════════════════════════

interface SavedPrompt {
  id: string;
  name: string;
  premise: string;
  genre: string[];
  era: string;
  setting: string;
  mood: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function loadPrompts(): SavedPrompt[] {
  ensureDir();
  if (!existsSync(PROMPTS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(PROMPTS_FILE, "utf-8"));
  } catch { return []; }
}

function savePrompts(prompts: SavedPrompt[]): void {
  ensureDir();
  writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
}

async function handlePrompts(body: Record<string, unknown>): Promise<NextResponse> {
  const subAction = body.subAction as string;

  switch (subAction) {
    case "list": {
      return NextResponse.json({ data: { prompts: loadPrompts() } });
    }
    case "create": {
      const prompts = loadPrompts();
      const now = new Date().toISOString();
      const newPrompt: SavedPrompt = {
        id: "prompt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
        name: (body.name as string) || "Unnamed Prompt",
        premise: (body.premise as string) || "",
        genre: (body.genre as string[]) || [],
        era: (body.era as string) || "",
        setting: (body.setting as string) || "",
        mood: (body.mood as string[]) || [],
        notes: (body.notes as string) || "",
        createdAt: now,
        updatedAt: now,
      };
      prompts.push(newPrompt);
      savePrompts(prompts);
      return NextResponse.json({ data: newPrompt });
    }
    case "update": {
      const promptId = body.promptId as string;
      if (!promptId) return NextResponse.json({ error: "Missing promptId" }, { status: 400 });
      const prompts = loadPrompts();
      const idx = prompts.findIndex(p => p.id === promptId);
      if (idx === -1) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
      const fields = ["name", "premise", "genre", "era", "setting", "mood", "notes"] as const;
      for (const f of fields) {
        if (body[f] !== undefined) (prompts[idx] as unknown as Record<string, unknown>)[f] = body[f];
      }
      prompts[idx].updatedAt = new Date().toISOString();
      savePrompts(prompts);
      return NextResponse.json({ data: prompts[idx] });
    }
    case "delete": {
      const promptId = body.promptId as string;
      if (!promptId) return NextResponse.json({ error: "Missing promptId" }, { status: 400 });
      const prompts = loadPrompts();
      const filtered = prompts.filter(p => p.id !== promptId);
      if (filtered.length === prompts.length) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
      savePrompts(filtered);
      return NextResponse.json({ data: { deleted: true } });
    }
    default:
      return NextResponse.json({ error: "Unknown subAction: " + subAction }, { status: 400 });
  }
}
