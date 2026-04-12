import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

// PUT — Toggle a skill on/off for a profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  try {
    const body = await request.json();
    const { profile = "default", enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 });
    }

    let configPath: string;
    if (profile === "default") {
      configPath = HERMES_HOME + "/config.yaml";
    } else {
      configPath = HERMES_HOME + "/profiles/" + profile + "/config.yaml";
    }

    if (!existsSync(configPath)) {
      return NextResponse.json({ error: "Profile config not found" }, { status: 404 });
    }

    // Update skills.disabled in YAML
    const content = readFileSync(configPath, "utf-8");
    const lines = content.split("\n");
    let inSkills = false;
    let inDisabled = false;
    let disabledStart = -1;
    let disabledEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (trimmed.startsWith("skills:")) {
        inSkills = true;
        continue;
      }
      if (inSkills && !lines[i].startsWith(" ") && trimmed) {
        inSkills = false;
      }
      if (inSkills && trimmed.startsWith("disabled:")) {
        inDisabled = true;
        disabledStart = i;
        continue;
      }
      if (inDisabled) {
        if (!lines[i].startsWith("  ") || (!trimmed.startsWith("-") && trimmed)) {
          disabledEnd = i;
          inDisabled = false;
        }
      }
    }
    if (inDisabled && disabledEnd === -1) disabledEnd = lines.length;

    // Parse current disabled list
    const currentDisabled: string[] = [];
    if (disabledStart >= 0 && disabledEnd > disabledStart) {
      for (let i = disabledStart + 1; i < disabledEnd; i++) {
        const match = lines[i].trim().match(/^-\s*(.+)$/);
        if (match) currentDisabled.push(match[1].trim());
      }
    }

    // Update the list
    const newDisabled = enabled
      ? currentDisabled.filter((s) => s !== name)
      : currentDisabled.includes(name)
        ? currentDisabled
        : [...currentDisabled, name].sort();

    // Write back
    const newDisabledYaml = newDisabled.length > 0
      ? "  disabled:\n" + newDisabled.map((s) => "    - " + s).join("\n") + "\n"
      : "  disabled: []\n";

    if (disabledStart >= 0 && disabledEnd > disabledStart) {
      lines.splice(disabledStart, disabledEnd - disabledStart, ...newDisabledYaml.trimEnd().split("\n"));
    } else {
      // Find skills section and add disabled list
      let insertAt = lines.length;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("skills:")) {
          insertAt = i + 1;
          break;
        }
      }
      if (insertAt === lines.length) {
        lines.push("skills:");
      }
      lines.splice(insertAt, 0, ...newDisabledYaml.trimEnd().split("\n"));
    }

    readFileSync(configPath); // Ensure file exists
    const { writeFileSync } = await import("fs");
    writeFileSync(configPath, lines.join("\n"));

    return NextResponse.json({
      data: { success: true, skill: name, profile, enabled },
    });
  } catch (error) {
    logApiError("PUT /api/skills/[name]/toggle", "toggling skill", error);
    return NextResponse.json({ error: "Failed to toggle skill" }, { status: 500 });
  }
}
