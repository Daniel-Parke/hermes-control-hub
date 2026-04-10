import yaml from "js-yaml";
// ═══════════════════════════════════════════════════════════════
// Tools API — Read/write toolset configuration per platform
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";

import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
const CONFIG_PATH = PATHS.config;

// All known toolsets from the Hermes toolsets reference
const AVAILABLE_TOOLSETS: Record<
  string,
  { label: string; description: string; category: "core" | "composite" | "platform" }
> = {
  browser: { label: "Browser", description: "Full browser automation (navigate, click, snapshot, vision)", category: "core" },
  clarify: { label: "Clarify", description: "Ask the user a question when clarification is needed", category: "core" },
  code_execution: { label: "Code Execution", description: "Run Python scripts that call Hermes tools programmatically", category: "core" },
  cronjob: { label: "Cronjob", description: "Schedule and manage recurring tasks", category: "core" },
  delegation: { label: "Delegation", description: "Spawn isolated subagent instances for parallel work", category: "core" },
  file: { label: "File", description: "File reading, writing, searching, and editing", category: "core" },
  image_gen: { label: "Image Gen", description: "Text-to-image generation via FAL.ai", category: "core" },
  memory: { label: "Memory", description: "Persistent cross-session memory management", category: "core" },
  session_search: { label: "Session Search", description: "Search past conversation sessions", category: "core" },
  skills: { label: "Skills", description: "Skill CRUD and browsing", category: "core" },
  terminal: { label: "Terminal", description: "Shell command execution and background process management", category: "core" },
  todo: { label: "Todo", description: "Task list management within a session", category: "core" },
  tts: { label: "TTS", description: "Text-to-speech audio generation", category: "core" },
  vision: { label: "Vision", description: "Image analysis via vision-capable models", category: "core" },
  web: { label: "Web", description: "Web search and page content extraction", category: "core" },
  homeassistant: { label: "Home Assistant", description: "Smart home control via Home Assistant", category: "core" },
  // Platform toolsets
  "hermes-cli": { label: "Hermes CLI", description: "Full CLI toolset — all core tools", category: "platform" },
  "hermes-telegram": { label: "Hermes Telegram", description: "Telegram gateway toolset", category: "platform" },
  "hermes-discord": { label: "Hermes Discord", description: "Discord gateway toolset", category: "platform" },
  "hermes-slack": { label: "Hermes Slack", description: "Slack gateway toolset", category: "platform" },
  "hermes-whatsapp": { label: "Hermes WhatsApp", description: "WhatsApp gateway toolset", category: "platform" },
  "hermes-signal": { label: "Hermes Signal", description: "Signal gateway toolset", category: "platform" },
  "hermes-homeassistant": { label: "Hermes HA", description: "Home Assistant gateway toolset", category: "platform" },
};

function parseYamlToolsets(content: string): Record<string, string[]> {
  try {
    const parsed = yaml.load(content) as Record<string, unknown>;
    const toolsets = parsed?.platform_toolsets as Record<string, string[]>;
    return toolsets || {};
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return NextResponse.json(
        { error: "Config file not found" },
        { status: 404 }
      );
    }

    const content = readFileSync(CONFIG_PATH, "utf-8");
    const platformToolsets = parseYamlToolsets(content);

    // Get the active toolsets list
    const activeToolsets: string[] = [];
    const toolsetsMatch = content.match(/^toolsets:\n((?:  - .+\n)*)/m);
    if (toolsetsMatch) {
      const matches = toolsetsMatch[1].matchAll(/  - (.+)/g);
      for (const m of matches) {
        activeToolsets.push(m[1]);
      }
    }

    return NextResponse.json({
      data: {
        available: AVAILABLE_TOOLSETS,
        platformToolsets,
        activeToolsets,
      },
    });
  } catch (error) {
    logApiError("GET /api/tools", "reading toolset configuration", error);
    return NextResponse.json(
      { error: "Failed to read toolset configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, toolsets } = body;

    if (!platform || !Array.isArray(toolsets)) {
      return NextResponse.json(
        { error: "platform and toolsets[] are required" },
        { status: 400 }
      );
    }

    if (!existsSync(CONFIG_PATH)) {
      return NextResponse.json(
        { error: "Config file not found" },
        { status: 404 }
      );
    }

    const content = readFileSync(CONFIG_PATH, "utf-8");
    const lines = content.split("\n");
    const newLines: string[] = [];

    let inToolsets = false;
    let inPlatform = false;
    let currentPlatform = "";
    let platformIndent = "";
    let platformInserted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimEnd();

      if (trimmed === "platform_toolsets:") {
        inToolsets = true;
        newLines.push(line);
        continue;
      }

      if (inToolsets) {
        // Check for end of toolsets section
        if (trimmed.length > 0 && !trimmed.startsWith(" ") && trimmed !== "platform_toolsets:") {
          // End of toolsets section — insert our platform if not yet done
          if (!platformInserted && platform !== "cli") {
            newLines.push(`  ${platform}:`);
            for (const ts of toolsets) {
              newLines.push(`  - ${ts}`);
            }
            platformInserted = true;
          }
          inToolsets = false;
          newLines.push(line);
          continue;
        }

        // Platform name
        const platformMatch = trimmed.match(/^  ([a-z_-]+):$/);
        if (platformMatch) {
          if (inPlatform && currentPlatform === platform) {
            // We finished writing our platform's toolsets
            inPlatform = false;
          }
          currentPlatform = platformMatch[1];

          if (currentPlatform === platform) {
            // Replace this platform's toolsets
            inPlatform = true;
            platformInserted = true;
            newLines.push(line); // platform name line
            // Write new toolsets
            for (const ts of toolsets) {
              newLines.push(`  - ${ts}`);
            }
            // Skip old toolset lines
            while (i + 1 < lines.length && lines[i + 1].trimStart().startsWith("- ")) {
              i++;
            }
            continue;
          }
        }

        if (inPlatform && currentPlatform === platform) {
          // Skip old toolset lines for this platform
          continue;
        }
      }

      newLines.push(line);
    }

    // If platform wasn't found and not yet inserted
    if (!platformInserted && inToolsets) {
      newLines.push(`  ${platform}:`);
      for (const ts of toolsets) {
        newLines.push(`  - ${ts}`);
      }
    }

    writeFileSync(CONFIG_PATH, newLines.join("\n"), "utf-8");

    return NextResponse.json({
      data: {
        success: true,
        platform,
        toolsets,
      },
    });
  } catch (error) {
    logApiError("PUT /api/tools", "updating toolset configuration", error);
    return NextResponse.json(
      { error: "Failed to update toolset configuration" },
      { status: 500 }
    );
  }
}
