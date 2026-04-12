import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

// PUT — Update personality for a profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, personality } = body;

    if (!personality || typeof personality !== "string") {
      return NextResponse.json({ error: "Personality is required" }, { status: 400 });
    }

    let configPath: string;
    if (!profile || profile === "default") {
      configPath = HERMES_HOME + "/config.yaml";
    } else {
      configPath = HERMES_HOME + "/profiles/" + profile + "/config.yaml";
    }

    if (!existsSync(configPath)) {
      return NextResponse.json({ error: "Profile config not found" }, { status: 404 });
    }

    // Update personality in YAML
    const content = readFileSync(configPath, "utf-8");
    const lines = content.split("\n");
    let inAgent = false;
    let foundPersonality = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("agent:")) {
        inAgent = true;
        continue;
      }
      if (inAgent && !lines[i].startsWith(" ") && lines[i].trim()) {
        // End of agent section — insert personality here
        if (!foundPersonality) {
          lines.splice(i, 0, "  personality: " + personality);
          foundPersonality = true;
        }
        inAgent = false;
      }
      if (inAgent && lines[i].includes("personality:")) {
        const trimmed = lines[i].trimEnd();
        const indent = lines[i].length - lines[i].trimStart().length;
        lines[i] = " ".repeat(indent) + "personality: " + personality;
        foundPersonality = true;
      }
    }

    if (!foundPersonality && inAgent) {
      lines.push("  personality: " + personality);
    }

    writeFileSync(configPath, lines.join("\n"));

    return NextResponse.json({ data: { success: true, profile: profile || "default", personality } });
  } catch (error) {
    logApiError("PUT /api/agent/personality", "updating personality", error);
    return NextResponse.json({ error: "Failed to update personality" }, { status: 500 });
  }
}
