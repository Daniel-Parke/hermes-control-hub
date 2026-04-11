import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { getSystemPrompt } from "@/lib/recroom/prompt-templates";
import type { ApiResponse } from "@/types/hermes";
import type {
  RecRoomRequest,
  EnhanceResponse,
  GenerateResponse,
  SavedItem,
} from "@/types/recroom";

// ═══════════════════════════════════════════════════════════════
// Rec Room API — Prompt Enhancement + Content Generation
// ═══════════════════════════════════════════════════════════════
// POST /api/recroom — Unified endpoint for all Rec Room actions
//
// LLM calls route through the Hermes Gateway API Server (port 8642).
// This server is built into the gateway, has full credential access,
// and exposes an OpenAI-compatible /v1/chat/completions endpoint.
//
// Requirements:
//   - Gateway must be running
//   - API_SERVER_ENABLED=true in ~/.hermes/.env

const SAVE_DIR = HERMES_HOME + "/mission-control/data/recroom";
const GATEWAY_API = "http://127.0.0.1:8642/v1/chat/completions";

function ensureSaveDir() {
  if (!existsSync(SAVE_DIR)) mkdirSync(SAVE_DIR, { recursive: true });
}

function getSavePath(activity: string, id: string): string {
  return SAVE_DIR + "/" + activity + "_" + id + ".json";
}

/**
 * Call the LLM via the Hermes Gateway API Server.
 * The gateway handles credential resolution and provider routing.
 */
/**
 * Call the LLM via the Hermes Gateway API Server with retry logic.
 * Handles rate limiting (429), timeouts, empty responses, and connection errors.
 */
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(GATEWAY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "hermes",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.8,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      // Rate limit — wait and retry
      if (response.status === 429) {
        const waitSeconds = Math.min(30 * attempt, 90);
        lastError = new Error(`Rate limit reached. Retrying in ${waitSeconds}s (attempt ${attempt}/${maxRetries})...`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, waitSeconds * 1000));
          continue;
        }
        throw new Error("Rate limit reached. Please wait a minute and try again.");
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error("Gateway API error " + response.status + ": " + text.slice(0, 200));
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Empty response — often caused by rate limiting or model error
      if (!content || content.trim().length === 0) {
        lastError = new Error("Empty response from LLM");
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 5000 * attempt));
          continue;
        }
        throw new Error("The model returned an empty response. This may be due to rate limiting — please wait a moment and try again.");
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("LLM request timed out (120s). The model may be overloaded — please try again.");
      }
      if (error instanceof Error && error.message.includes("fetch failed")) {
        throw new Error(
          "Cannot connect to Gateway API at " + GATEWAY_API +
          ". Ensure the gateway is running with API_SERVER_ENABLED=true in ~/.hermes/.env"
        );
      }
      // Re-throw rate limit and empty response errors from above
      if (error instanceof Error && (error.message.includes("Rate limit") || error.message.includes("empty response"))) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("LLM call failed after retries");
}

// ── POST Handler ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: RecRoomRequest = await request.json();
    const { action } = body;

    switch (action) {
      case "enhance":
        return await handleEnhance(body);
      case "generate":
        return await handleGenerate(body);
      case "refine":
        return await handleRefine(body);
      case "convert":
        return await handleConvert(body);
      case "save":
        return await handleSave(body);
      case "load":
        return await handleLoad(body);
      case "list":
        return await handleList(body);
      case "delete":
        return await handleDelete(body);
      default:
        return NextResponse.json(
          { error: "Unknown action: " + action },
          { status: 400 }
        );
    }
  } catch (error) {
    logApiError("POST /api/recroom", "processing request", error);
    return NextResponse.json(
      { error: "Request failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}

// ── Action Handlers ──────────────────────────────────────────

async function handleEnhance(body: RecRoomRequest): Promise<NextResponse<ApiResponse<EnhanceResponse>>> {
  const { activity, prompt } = body;
  if (!activity || !prompt) {
    return NextResponse.json({ error: "Missing activity or prompt" }, { status: 400 });
  }

  const systemPrompt = getSystemPrompt(activity, "enhance");
  if (!systemPrompt) {
    return NextResponse.json({ error: "No enhancement template for: " + activity }, { status: 400 });
  }

  try {
    const raw = await callLLM(systemPrompt, prompt);
    // Clean markdown fences and parse JSON
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const result: EnhanceResponse = JSON.parse(cleaned);

    // Validate structure
    if (!result.interpretation || !Array.isArray(result.options)) {
      throw new Error("Invalid enhancement response structure");
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    logApiError("POST /api/recroom", "enhancing prompt", error);
    const message = error instanceof Error ? error.message : "Enhancement failed";
    // Return error to frontend so user sees it instead of silent fallback
    return NextResponse.json({
      error: message,
      data: {
        interpretation: prompt,
        techniques: [],
        options: [{ label: "Default", description: "Generate as described", params: {} }],
      },
    });
  }
}

async function handleGenerate(body: RecRoomRequest): Promise<NextResponse<ApiResponse<GenerateResponse>>> {
  const { activity, prompt, enhancedPrompt, context, refinement } = body;
  const effectivePrompt = enhancedPrompt || prompt || "";

  if (!activity || !effectivePrompt) {
    return NextResponse.json({ error: "Missing activity or prompt" }, { status: 400 });
  }

  const phase = refinement ? "refine" : "generate";
  const systemPrompt = getSystemPrompt(activity, phase);
  if (!systemPrompt) {
    return NextResponse.json({ error: "No generation template for: " + activity }, { status: 400 });
  }

  let userMessage = effectivePrompt;
  if (context) {
    userMessage += "\n\nContext: " + JSON.stringify(context);
  }
  if (refinement) {
    userMessage += "\n\nRefinement request: " + refinement;
  }
  if (body.previousOutput) {
    userMessage += "\n\nPrevious output:\n" + body.previousOutput;
  }

  try {
    const output = await callLLM(systemPrompt, userMessage);
    const format = activity === "creative-canvas" ? "html" : "text";
    return NextResponse.json({
      data: { output, format, metadata: context || {} },
    });
  } catch (error) {
    logApiError("POST /api/recroom", "generating content", error);
    return NextResponse.json(
      { error: "Generation failed: " + (error instanceof Error ? error.message : "Unknown") },
      { status: 500 }
    );
  }
}

async function handleRefine(body: RecRoomRequest): Promise<NextResponse<ApiResponse<GenerateResponse>>> {
  return handleGenerate({ ...body, refinement: body.refinement });
}

async function handleConvert(body: RecRoomRequest): Promise<NextResponse<ApiResponse<GenerateResponse>>> {
  // Image-to-ASCII conversion — handled via system prompt guidance
  const { activity, imageData, context } = body;
  if (!activity || !imageData) {
    return NextResponse.json({ error: "Missing activity or image data" }, { status: 400 });
  }

  const systemPrompt = getSystemPrompt(activity, "convert");
  const userMessage = "Convert this image to ASCII art. Settings: " + JSON.stringify(context || {});

  try {
    const output = await callLLM(systemPrompt, userMessage);
    return NextResponse.json({
      data: { output, format: "text" as const, metadata: context || {} },
    });
  } catch (error) {
    logApiError("POST /api/recroom", "converting image", error);
    return NextResponse.json(
      { error: "Conversion failed" },
      { status: 500 }
    );
  }
}

// ── Save / Load / List / Delete ──────────────────────────────

async function handleSave(body: RecRoomRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  ensureSaveDir();
  const { activity, name, prompt, enhancedPrompt } = body;
  const output = typeof body.context?.output === "string" ? body.context.output : "";
  const outputFormat = typeof body.context?.outputFormat === "string" ? body.context.outputFormat : "text";

  if (!activity || !name) {
    return NextResponse.json({ error: "Missing activity or name" }, { status: 400 });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = new Date().toISOString();
  const item: SavedItem = {
    id,
    activity,
    name,
    prompt: prompt || "",
    enhancedPrompt: enhancedPrompt || null,
    output,
    outputFormat: outputFormat as SavedItem["outputFormat"],
    createdAt: now,
    updatedAt: now,
    metadata: (body.context as Record<string, unknown>) || {},
  };

  try {
    writeFileSync(getSavePath(activity, id), JSON.stringify(item, null, 2));
    return NextResponse.json({ data: { id } });
  } catch (error) {
    logApiError("POST /api/recroom", "saving item", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

async function handleLoad(body: RecRoomRequest): Promise<NextResponse<ApiResponse<SavedItem>>> {
  const { activity, id } = body;
  if (!activity || !id) {
    return NextResponse.json({ error: "Missing activity or id" }, { status: 400 });
  }

  const path = getSavePath(activity, id);
  if (!existsSync(path)) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    const item: SavedItem = JSON.parse(readFileSync(path, "utf-8"));
    return NextResponse.json({ data: item });
  } catch (error) {
    logApiError("POST /api/recroom", "loading item", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

async function handleList(body: RecRoomRequest): Promise<NextResponse<ApiResponse<{ items: SavedItem[] }>>> {
  ensureSaveDir();
  const { activity } = body;

  try {
    const files = readdirSync(SAVE_DIR).filter((f) => {
      if (!f.endsWith(".json")) return false;
      if (activity) return f.startsWith(activity + "_");
      return true;
    });

    const items: SavedItem[] = [];
    for (const file of files) {
      try {
        const item: SavedItem = JSON.parse(readFileSync(SAVE_DIR + "/" + file, "utf-8"));
        items.push(item);
      } catch {}
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ data: { items } });
  } catch (error) {
    logApiError("POST /api/recroom", "listing items", error);
    return NextResponse.json({ data: { items: [] } });
  }
}

async function handleDelete(body: RecRoomRequest): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  const { activity, id } = body;
  if (!activity || !id) {
    return NextResponse.json({ error: "Missing activity or id" }, { status: 400 });
  }

  const path = getSavePath(activity, id);
  if (!existsSync(path)) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    unlinkSync(path);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    logApiError("POST /api/recroom", "deleting item", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
