import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import yaml from "js-yaml";

import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
const CONFIG_PATH = PATHS.config;

function parseConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return (yaml.load(content) as Record<string, unknown>) || {};
}

// GET /api/config — return full config
export async function GET() {
  try {
    const config = parseConfig();
    return NextResponse.json({ data: config });
  } catch (error) {
    logApiError("GET /api/config", "reading config.yaml", error);
    return NextResponse.json(
      { error: "Failed to read config.yaml" },
      { status: 500 }
    );
  }
}

// PUT /api/config — update specific section
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, values } = body;

    if (!section || !values) {
      return NextResponse.json(
        { error: "Missing 'section' or 'values'" },
        { status: 400 }
      );
    }

    const config = parseConfig();

    // Create backup
    if (existsSync(CONFIG_PATH)) {
      const backupDir = PATHS.backups;
      mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${backupDir}/config.yaml.${timestamp}.bak`;
      writeFileSync(backupPath, readFileSync(CONFIG_PATH, "utf-8"), "utf-8");
    }

    // Merge values into section
    const current = (config[section] as Record<string, unknown>) || {};
    config[section] = { ...current, ...values };

    // Write back
    const content = yaml.dump(config, { lineWidth: -1, noRefs: true });
    writeFileSync(CONFIG_PATH, content, "utf-8");

    return NextResponse.json({ data: { success: true, section, values } });
  } catch (error) {
    logApiError("PUT /api/config", "updating config", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
