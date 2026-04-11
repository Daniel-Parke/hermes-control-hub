import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { getStoryPrompt } from "@/lib/story-weaver/prompts";
import type { ApiResponse } from "@/types/hermes";

// ═══════════════════════════════════════════════════════════════
// Stories API — Dedicated Story Weaver backend
// ═══════════════════════════════════════════════════════════════

const SAVE_DIR = HERMES_HOME + "/mission-control/data/stories";
const GATEWAY_API = "http://127.0.0.1:8642/v1/chat/completions";

/**
 * Quick formatting check — returns true if the chapter needs a formatting pass.
 */
function checkFormatting(content: string): boolean {
  const paragraphs = content.split(/\n\n+/);

  // Check for overly long paragraphs (>8 sentences)
  for (const p of paragraphs) {
    const sentences = p.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 8) return true;
  }

  // Check for missing paragraph breaks (single block > 500 chars without breaks)
  if (paragraphs.length === 1 && content.length > 500) return true;

  // Check for very short content (might be truncated)
  if (content.split(/\s+/).length < 200) return false; // too short to judge

  return false;
}

function ensureDir() {
  if (!existsSync(SAVE_DIR)) mkdirSync(SAVE_DIR, { recursive: true });
}

function getPath(id: string): string {
  return SAVE_DIR + "/" + id + ".json";
}

async function callLLM(system: string, user: string): Promise<string> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);
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
      if (err instanceof Error && err.name === "AbortError") throw new Error("Request timed out (180s). Please try again.");
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 3_000 * attempt));
    } finally { clearTimeout(timeout); }
  }
  throw new Error("LLM call failed after retries");
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
      case "update": return handleUpdate(body);
      case "delete": return handleDelete(body);
      default: return NextResponse.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (err) {
    logApiError("POST /api/stories", "request", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

// ── Create: Plan + Chapter 1 in one call ─────────────────────

async function handleCreate(body: any): Promise<NextResponse> {
  ensureDir();
  const { title, config } = body;
  if (!config?.premise) return NextResponse.json({ error: "Missing premise" }, { status: 400 });

  const system = getStoryPrompt("plan");
  const wordRanges: Record<string, string> = {
  short: "800-1200", medium: "1200-1800", standard: "1800-2500",
  long: "2500-3500", epic: "3500-5000", marathon: "5000+",
};
const wcRange = wordRanges[config.wordCountRange] || "1800-2500";

const userMessage = `Story configuration:
Title: ${title || "Untitled"}
Premise: ${config.premise}
Genre: ${config.genre || "General"}
Era: ${config.era || "Modern"}
Setting: ${config.setting || ""}
Mood: ${(config.mood || []).join(", ")}
POV: ${config.pov || "first"}
Length: ${config.length || "medium"}
Chapter Length: ${wcRange} words per chapter (prioritise quality, aim within range)
Characters: ${(config.characters || []).map((c: any) => `${c.name} (${c.role}): ${c.description}`).join("; ")}`;

  try {
    const raw = await callLLM(system, userMessage);

    // Parse plan and chapter from the structured response
    let plan: any = null;
    let chapter1 = "";

    const planMatch = raw.match(/===PLAN===\s*([\s\S]*?)(?===CHAPTER 1===|$)/);
    const chapterMatch = raw.match(/===CHAPTER 1===\s*([\s\S]*?)$/);

    if (planMatch) {
      try { plan = JSON.parse(planMatch[1].trim()); } catch {}
    }
    if (chapterMatch) {
      chapter1 = chapterMatch[1].trim();
    }

    // Fallback: try to parse entire response as plan JSON
    if (!plan) {
      try {
        const cleaned = raw.replace(/```json\s*/i, "").replace(/```\s*/g, "").trim();
        // Try to find JSON block
        const jsonMatch = cleaned.match(/\{[\s\S]*"chapters"[\s\S]*\}/);
        if (jsonMatch) plan = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    // Fallback: use raw as chapter if no structure found
    if (!chapter1 && !plan) {
      chapter1 = raw;
      plan = {
        title: title || "Untitled Story",
        premise: config.premise,
        chapters: [{ title: "Chapter 1", key_events: [], emotional_beat: "beginning", deviation_hooks: [] }],
        character_notes: [],
        world_rules: [],
      };
    }

    if (!plan) {
      plan = {
        title: title || "Untitled Story",
        premise: config.premise,
        chapters: [{ title: "Chapter 1", key_events: [], emotional_beat: "beginning", deviation_hooks: [] }],
        character_notes: [],
        world_rules: [],
      };
    }

    const storyId = "story_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    const storyTitle = title || plan.title || "Untitled Story";

    const story = {
      id: storyId,
      title: storyTitle,
      premise: config.premise,
      config,
      outline: plan,
      chapters: plan.chapters.map((ch: any, i: number) => ({
        number: i + 1,
        title: ch.title,
        status: i === 0 ? "complete" : "pending",
        wordCount: i === 0 ? chapter1.split(/\s+/).length : 0,
        generatedAt: i === 0 ? new Date().toISOString() : null,
      })),
      chapterContents: chapter1 ? { "1": chapter1 } : {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    writeFileSync(getPath(storyId), JSON.stringify(story, null, 2));
    return NextResponse.json({ data: story });
  } catch (err) {
    logApiError("POST /api/stories", "create", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Creation failed" }, { status: 500 });
  }
}

// ── Generate Next Chapter ────────────────────────────────────

async function handleGenerateChapter(body: any): Promise<NextResponse> {
  const { storyId } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  const path = getPath(storyId);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const story = JSON.parse(readFileSync(path, "utf-8"));
  const nextNum = story.chapters.findIndex((c: any) => c.status === "pending") + 1;
  if (nextNum === 0) return NextResponse.json({ error: "All chapters complete" }, { status: 400 });

  // Mark as writing
  story.chapters[nextNum - 1].status = "writing";
  writeFileSync(path, JSON.stringify(story, null, 2));

  try {
    const system = getStoryPrompt("chapter");
    const wordRanges2: Record<string, string> = {
      short: "800-1200", medium: "1200-1800", standard: "1800-2500",
      long: "2500-3500", epic: "3500-5000", marathon: "5000+",
    };
    const wcRange2 = wordRanges2[story.config?.wordCountRange] || "1800-2500";

    const prevChapters = Object.entries(story.chapterContents as Record<string, string>)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([num, text]) => `Chapter ${num}:\n${text}`)
      .join("\n\n---\n\n");

    const userMessage = `STORY PLAN:
${JSON.stringify(story.outline, null, 2)}

PREVIOUS CHAPTERS:
${prevChapters}

Chapter Length: ${wcRange2} words (prioritise quality, aim within range)

Write Chapter ${nextNum} now.`;

    let content = await callLLM(system, userMessage);

    // Formatting review pass — check for common issues and fix
    const needsFormatting = checkFormatting(content);
    if (needsFormatting) {
      try {
        const formatPrompt = getStoryPrompt("format");
        content = await callLLM(formatPrompt, "Review and improve the formatting of this chapter:\n\n" + content);
      } catch {
        // Formatting failed — use original content
      }
    }

    story.chapterContents[nextNum] = content;
    story.chapters[nextNum - 1].status = "complete";
    story.chapters[nextNum - 1].wordCount = content.split(/\s+/).length;
    story.chapters[nextNum - 1].generatedAt = new Date().toISOString();
    story.updatedAt = new Date().toISOString();

    // Check if all complete
    if (story.chapters.every((c: any) => c.status === "complete")) {
      story.status = "complete";
    }

    writeFileSync(path, JSON.stringify(story, null, 2));
    return NextResponse.json({ data: { chapter: nextNum, content, story } });
  } catch (err) {
    story.chapters[nextNum - 1].status = "failed";
    writeFileSync(path, JSON.stringify(story, null, 2));
    logApiError("POST /api/stories", "generate-chapter", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed" }, { status: 500 });
  }
}

// ── List ─────────────────────────────────────────────────────

async function handleList(): Promise<NextResponse> {
  ensureDir();
  try {
    const files = readdirSync(SAVE_DIR).filter(f => f.endsWith(".json"));
    const stories = files.map(f => {
      try {
        const s = JSON.parse(readFileSync(SAVE_DIR + "/" + f, "utf-8"));
        // Return summary only (no chapter contents for list)
        return {
          id: s.id, title: s.title, premise: s.premise,
          config: s.config, status: s.status,
          chapters: s.chapters?.map((c: any) => ({ number: c.number, title: c.title, status: c.status, wordCount: c.wordCount })),
          createdAt: s.createdAt, updatedAt: s.updatedAt,
        };
      } catch { return null; }
    }).filter(Boolean);
    stories.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ data: { stories } });
  } catch { return NextResponse.json({ data: { stories: [] } }); }
}

// ── Load ─────────────────────────────────────────────────────

async function handleLoad(body: any): Promise<NextResponse> {
  const { storyId } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
  const path = getPath(storyId);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(readFileSync(path, "utf-8")) });
}

// ── Update ───────────────────────────────────────────────────

async function handleUpdate(body: any): Promise<NextResponse> {
  const { storyId, ...fields } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
  const path = getPath(storyId);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  const story = JSON.parse(readFileSync(path, "utf-8"));
  if (fields.title) story.title = fields.title;
  story.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(story, null, 2));
  return NextResponse.json({ data: story });
}

// ── Delete ───────────────────────────────────────────────────

async function handleDelete(body: any): Promise<NextResponse> {
  const { storyId } = body;
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
  const path = getPath(storyId);
  if (!existsSync(path)) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  unlinkSync(path);
  return NextResponse.json({ data: { deleted: true } });
}
